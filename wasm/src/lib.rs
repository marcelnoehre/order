use bit_set::BitSet;
use odis::algorithms::{SearchBudget, dimdraw::DimDraw, dimflux::DimFlux};
use odis::{ConceptDrawingAlgorithm, DrawingAlgorithm, FormalContext};
use rust_sugiyama::configure::{CrossingMinimization, RankingType};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
struct Context {
    objects: Vec<String>,
    attributes: Vec<String>,
    incidence: Vec<(usize, usize)>,
}

#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
struct Options {
    timeout_ms: Option<f64>,
    ranking: Option<String>,
    crossing_minimization: Option<String>,
    transpose: Option<bool>,
    dummy_vertices: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Node {
    x: f64,
    y: f64,
    extent: Vec<usize>,
    intent: Vec<usize>,
    object_labels: Vec<String>,
    attribute_labels: Vec<String>,
}

#[derive(Serialize)]
struct Drawing {
    nodes: Vec<Node>,
    edges: Vec<(u32, u32)>,
}

fn formal_context(context: Context) -> Result<FormalContext<String>, JsError> {
    let mut intents = vec![BitSet::new(); context.objects.len()];
    for (g, m) in context.incidence {
        if g >= context.objects.len() || m >= context.attributes.len() {
            return Err(JsError::new(&format!("Incidence ({g}, {m}) is out of range")));
        }
        intents[g].insert(m);
    }
    let mut ctx = FormalContext::new();
    for attribute in context.attributes {
        ctx.add_attribute(attribute, &BitSet::new());
    }
    for (object, intent) in context.objects.into_iter().zip(&intents) {
        ctx.add_object(object, intent);
    }
    Ok(ctx)
}

fn sugiyama(edges: &[(u32, u32)], node_count: usize, options: &Options) -> Result<Vec<(f64, f64)>, JsError> {
    let ranking = match options.ranking.as_deref().unwrap_or("minimize") {
        "minimize" => RankingType::MinimizeEdgeLength,
        "up" => RankingType::Up,
        "down" => RankingType::Down,
        "original" => RankingType::Original,
        other => return Err(JsError::new(&format!("Unknown ranking '{other}'"))),
    };
    let crossing_minimization = match options.crossing_minimization.as_deref().unwrap_or("barycenter") {
        "barycenter" => CrossingMinimization::Barycenter,
        "median" => CrossingMinimization::Median,
        other => return Err(JsError::new(&format!("Unknown crossing minimization '{other}'"))),
    };
    let mut coordinates = vec![(0.0, 0.0); node_count];
    if edges.is_empty() {
        return Ok(coordinates);
    }
    let layouts = rust_sugiyama::from_edges(edges)
        .vertex_spacing(1)
        .layering_type(ranking)
        .crossing_minimization(crossing_minimization)
        .transpose(options.transpose.unwrap_or(true))
        .dummy_vertices(options.dummy_vertices.unwrap_or(true))
        .build();
    let mut offset = 0.0;
    for (points, width, _) in layouts {
        for (node, (x, y)) in points {
            if node < node_count {
                coordinates[node] = (offset + x as f64, y as f64);
            }
        }
        offset += width as f64 + 1.0;
    }
    Ok(coordinates)
}

#[wasm_bindgen]
pub fn draw(algorithm: &str, context: JsValue, options: JsValue) -> Result<JsValue, JsError> {
    let options: Options = if options.is_undefined() || options.is_null() {
        Options::default()
    } else {
        serde_wasm_bindgen::from_value(options)?
    };
    let ctx = formal_context(serde_wasm_bindgen::from_value(context)?)?;
    if ctx.objects.is_empty() || ctx.attributes.is_empty() {
        return Ok(JsValue::NULL);
    }
    let Some(lattice) = ctx.concept_lattice() else {
        return Ok(JsValue::NULL);
    };
    let budget = options
        .timeout_ms
        .map_or(SearchBudget::Unbounded, |ms| SearchBudget::Milliseconds(ms as u64));
    let coordinates = match algorithm {
        "dimflux" => DimFlux { budget, ..DimFlux::default() }
            .draw_lattice(&lattice, ctx.objects.len(), ctx.attributes.len())
            .map(|drawing| drawing.coordinates),
        "dimdraw" => DimDraw { budget }.draw(&lattice).map(|drawing| drawing.coordinates),
        "sugiyama" => Some(sugiyama(
            &lattice.poset.covering_edges,
            lattice.poset.nodes.len(),
            &options,
        )?),
        other => return Err(JsError::new(&format!("Unknown algorithm '{other}'"))),
    };
    let Some(coordinates) = coordinates else {
        return Ok(JsValue::NULL);
    };
    let labels = ctx.reduced_labels(&lattice);
    let nodes = coordinates
        .iter()
        .zip(&lattice.poset.nodes)
        .zip(labels)
        .map(|((&(x, y), (extent, intent)), (object_labels, attribute_labels))| Node {
            x,
            y,
            extent: extent.iter().collect(),
            intent: intent.iter().collect(),
            object_labels,
            attribute_labels,
        })
        .collect();
    let result = Drawing {
        nodes,
        edges: lattice.poset.covering_edges.clone(),
    };
    Ok(serde_wasm_bindgen::to_value(&result)?)
}
