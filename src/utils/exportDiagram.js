import { NODE_RADIUS } from '../drawing/geometry.js'

const COLORS = {
  background: '#ffffff',
  node: '#000000',
  edge: '#a6a8af',
  attribute: '#12151d',
  object: '#6e7385',
}
const SCREEN_FONT = { family: "Inter, 'Helvetica Neue', Arial, sans-serif", attributeWeight: 500 }
const PDF_FONT = { family: 'helvetica', attributeWeight: 400 }
const FONT_SIZE = 12
const MARGIN = 24
const PNG_SCALE = 3
const ATTRIBUTE_OFFSET = -(NODE_RADIUS + 8)
const OBJECT_OFFSET = NODE_RADIUS + 18

let measureContext = null

function textWidth(text, weight, family) {
  measureContext ??= document.createElement('canvas').getContext('2d')
  measureContext.font = `${weight} ${FONT_SIZE}px ${family}`
  return measureContext.measureText(text).width
}

const escapeXml = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const round = (value) => Math.round(value * 100) / 100

const LATEX_ESCAPES = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  $: '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  _: '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}',
}

const escapeLatex = (text) => text.replace(/[\\{}$&#%_^~]/g, (c) => LATEX_ESCAPES[c])

const hexColor = (color) => color.slice(1).toUpperCase()

function geometry(lattice, { positions, scale }, show, font) {
  const points = positions.map((p) => ({ x: p.x * scale, y: p.y * scale }))
  const labels = lattice.nodes.flatMap((node, i) => [
    ...(show.attributes && node.attributeLabels.length
      ? [{ kind: 'attribute', text: node.attributeLabels.join(', '), x: points[i].x, y: points[i].y + ATTRIBUTE_OFFSET }]
      : []),
    ...(show.objects && node.objectLabels.length
      ? [{ kind: 'object', text: node.objectLabels.join(', '), x: points[i].x, y: points[i].y + OBJECT_OFFSET }]
      : []),
  ])

  const boxes = [
    ...points.map((p) => [p.x - NODE_RADIUS - 2, p.y - NODE_RADIUS - 2, p.x + NODE_RADIUS + 2, p.y + NODE_RADIUS + 2]),
    ...labels.map((label) => {
      const weight = label.kind === 'attribute' ? font.attributeWeight : 400
      const half = textWidth(label.text, weight, font.family) / 2 + 3
      return [label.x - half, label.y - FONT_SIZE, label.x + half, label.y + 4]
    }),
  ]
  const minX = Math.min(...boxes.map((b) => b[0])) - MARGIN
  const minY = Math.min(...boxes.map((b) => b[1])) - MARGIN
  const width = Math.max(...boxes.map((b) => b[2])) + MARGIN - minX
  const height = Math.max(...boxes.map((b) => b[3])) + MARGIN - minY
  const shift = (p) => ({ ...p, x: round(p.x - minX), y: round(p.y - minY) })

  return {
    points: points.map(shift),
    labels: labels.map(shift),
    width: Math.ceil(width),
    height: Math.ceil(height),
  }
}

export function diagramSvg(lattice, layout, show, font = SCREEN_FONT) {
  const { points, labels, width, height } = geometry(lattice, layout, show, font)
  const edges = lattice.edges
    .map(([a, b]) => `<line x1="${points[a].x}" y1="${points[a].y}" x2="${points[b].x}" y2="${points[b].y}"/>`)
    .join('')
  const nodes = points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="${NODE_RADIUS}"/>`).join('')
  const text = (label, attributes) =>
    `<text x="${label.x}" y="${label.y}" font-weight="${label.kind === 'attribute' ? font.attributeWeight : 400}" ${attributes}>${escapeXml(label.text)}</text>`
  const halos = labels
    .map((label) => text(label, `fill="${COLORS.background}" stroke="${COLORS.background}" stroke-width="4" stroke-linejoin="round"`))
    .join('')
  const texts = labels.map((label) => text(label, `fill="${COLORS[label.kind]}"`)).join('')

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${COLORS.background}"/>`,
    `<g stroke="${COLORS.edge}" stroke-width="1.5" stroke-linecap="round">${edges}</g>`,
    `<g fill="${COLORS.node}" stroke="${COLORS.background}" stroke-width="2.5">${nodes}</g>`,
    `<g font-family="${font.family.replace(/"/g, "'")}" font-size="${FONT_SIZE}" text-anchor="middle">${halos}${texts}</g>`,
    '</svg>',
  ].join('')

  return { svg, width, height }
}

export function diagramTikz(lattice, layout, show) {
  const { points } = geometry(lattice, layout, show, SCREEN_FONT)
  const coordinate = (p) => `(${p.x}, ${p.y})`
  const edges = lattice.edges.map(
    ([a, b]) => `  \\draw[cover] ${coordinate(points[a])} -- ${coordinate(points[b])};`,
  )
  const nodes = lattice.nodes.map((node, i) => {
    const labels = [
      show.attributes && node.attributeLabels.length
        ? `label={[attribute]above:{${escapeLatex(node.attributeLabels.join(', '))}}}`
        : null,
      show.objects && node.objectLabels.length
        ? `label={[object]below:{${escapeLatex(node.objectLabels.join(', '))}}}`
        : null,
    ].filter(Boolean)
    return `  \\node[${['concept', ...labels].join(', ')}] (c${i}) at ${coordinate(points[i])} {};`
  })

  return [
    '\\documentclass[tikz]{standalone}',
    `\\definecolor{cover}{HTML}{${hexColor(COLORS.edge)}}`,
    `\\definecolor{objectlabel}{HTML}{${hexColor(COLORS.object)}}`,
    '\\begin{document}',
    '\\begin{tikzpicture}[',
    '  x=1pt, y=-1pt,',
    `  concept/.style={circle, fill=black, draw=white, line width=1pt, inner sep=0pt, minimum size=10pt, label distance=1pt},`,
    '  cover/.style={draw=cover, line width=0.75pt},',
    '  attribute/.style={font=\\footnotesize, fill=white, inner sep=1pt},',
    '  object/.style={font=\\footnotesize, text=objectlabel, fill=white, inner sep=1pt},',
    ']',
    ...edges,
    ...nodes,
    '\\end{tikzpicture}',
    '\\end{document}',
    '',
  ].join('\n')
}

export async function diagramPng(lattice, layout, show) {
  const { svg, width, height } = diagramSvg(lattice, layout, show)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width * PNG_SCALE
    canvas.height = height * PNG_SCALE
    const context = canvas.getContext('2d')
    context.scale(PNG_SCALE, PNG_SCALE)
    context.drawImage(image, 0, 0, width, height)
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function diagramPdf(lattice, layout, show) {
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  const { svg, width, height } = diagramSvg(lattice, layout, show, PDF_FONT)
  const element = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
  const doc = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width, height],
  })
  await svg2pdf(element, doc, { x: 0, y: 0, width, height })
  return doc.output('blob')
}
