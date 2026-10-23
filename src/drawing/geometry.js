export const NODE_RADIUS = 7
const CLEARANCE = 5
const LEVEL_GAP = NODE_RADIUS * 2

export function coverNeighbours(lattice) {
  const upper = lattice.nodes.map(() => [])
  const lower = lattice.nodes.map(() => [])
  for (const [below, above] of lattice.edges) {
    upper[below].push(above)
    lower[above].push(below)
  }
  return { upper, lower }
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function isValidPosition(index, point, points, edges, { upper, lower }) {
  if (upper[index].some((u) => points[u].y > point.y - LEVEL_GAP)) return false
  if (lower[index].some((l) => points[l].y < point.y + LEVEL_GAP)) return false

  for (let z = 0; z < points.length; z++) {
    if (z !== index && Math.hypot(points[z].x - point.x, points[z].y - point.y) < 2 * NODE_RADIUS + CLEARANCE) {
      return false
    }
  }

  for (const [a, b] of edges) {
    if (a === index || b === index) continue
    if (distanceToSegment(point, points[a], points[b]) < NODE_RADIUS + CLEARANCE) return false
  }

  for (const neighbour of [...upper[index], ...lower[index]]) {
    for (let z = 0; z < points.length; z++) {
      if (z === index || z === neighbour) continue
      if (distanceToSegment(points[z], point, points[neighbour]) < NODE_RADIUS + CLEARANCE) return false
    }
  }

  return true
}
