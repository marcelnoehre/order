use bit_set::BitSet;
use odis::algorithms::{SearchBudget, dimdraw::DimDraw, dimflux::DimFlux, sugiyama::Sugiyama};
use odis::{ConceptDrawingAlgorithm, DrawingAlgorithm, FormalContext};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize)]
struct Context {
    objects: Vec<String>,
    attributes: Vec<String>,
    incidence: Vec<(usize, usize)>,
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

#[wasm_bindgen]
pub fn draw(algorithm: &str, context: JsValue, timeout_ms: Option<f64>) -> Result<JsValue, JsError> {
    let ctx = formal_context(serde_wasm_bindgen::from_value(context)?)?;
    if ctx.objects.is_empty() || ctx.attributes.is_empty() {
        return Ok(JsValue::NULL);
    }
    let Some(lattice) = ctx.concept_lattice() else {
        return Ok(JsValue::NULL);
    };
    let budget = timeout_ms.map_or(SearchBudget::Unbounded, |ms| SearchBudget::Milliseconds(ms as u64));
    let drawing = match algorithm {
        "dimflux" => DimFlux { budget, ..DimFlux::default() }.draw_lattice(
            &lattice,
            ctx.objects.len(),
            ctx.attributes.len(),
        ),
        "dimdraw" => DimDraw { budget }.draw(&lattice),
        "sugiyama" => Sugiyama { vertex_spacing: 1 }.draw(&lattice),
        other => return Err(JsError::new(&format!("Unknown algorithm '{other}'"))),
    };
    let Some(drawing) = drawing else {
        return Ok(JsValue::NULL);
    };
    let labels = ctx.reduced_labels(&lattice);
    let nodes = drawing
        .coordinates
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
