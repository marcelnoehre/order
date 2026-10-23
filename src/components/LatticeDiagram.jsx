import { useEffect, useMemo, useRef, useState } from 'react'
import { NODE_RADIUS, coverNeighbours, isValidPosition } from '../drawing/geometry.js'

const PADDING = 56
const MAX_SCALE = 140
const KEY_STEP = 6
const ARROWS = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

function orient(nodes) {
  let top = 0
  let bottom = 0
  nodes.forEach((node, i) => {
    if (node.extent.length > nodes[top].extent.length) top = i
    if (node.extent.length < nodes[bottom].extent.length) bottom = i
  })
  const flip = nodes[top].y > nodes[bottom].y ? -1 : 1
  return nodes.map((node) => ({ x: node.x, y: node.y * flip }))
}

function fitFrame(points, width, height) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX || 1
  const spanY = Math.max(...ys) - minY || 1
  const scale = Math.max(
    0,
    Math.min((width - 2 * PADDING) / spanX, (height - 2 * PADDING) / spanY, MAX_SCALE),
  )
  return {
    scale,
    offsetX: (width - spanX * scale) / 2 - minX * scale,
    offsetY: (height - spanY * scale) / 2 - minY * scale,
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function LatticeDiagram({ lattice, onHover, onEdit }) {
  const svgRef = useRef(null)
  const [size, setSize] = useState(null)
  const initial = useMemo(() => orient(lattice.nodes), [lattice])
  const neighbours = useMemo(() => coverNeighbours(lattice), [lattice])
  const [positions, setPositions] = useState(initial)
  const [drag, setDrag] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [focused, setFocused] = useState(null)
  const [rejected, setRejected] = useState(null)
  const shown = hovered ?? focused

  useEffect(() => {
    onHover?.(shown)
  }, [onHover, shown])

  useEffect(() => {
    onEdit?.(positions !== initial)
  }, [onEdit, positions, initial])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    )
    observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [])

  const frame = size && fitFrame(initial, size.width, size.height)
  const toScreen = (p) => ({ x: p.x * frame.scale + frame.offsetX, y: p.y * frame.scale + frame.offsetY })
  const toModel = (p) => ({ x: (p.x - frame.offsetX) / frame.scale, y: (p.y - frame.offsetY) / frame.scale })
  const points = frame ? positions.map(toScreen) : []
  if (drag) points[drag.index] = drag.point

  const keepInside = (p) => ({
    x: clamp(p.x, NODE_RADIUS, size.width - NODE_RADIUS),
    y: clamp(p.y, NODE_RADIUS, size.height - NODE_RADIUS),
  })

  const isValid = (index, point) => isValidPosition(index, point, points, lattice.edges, neighbours)

  const pointerPosition = (event) => {
    const rect = svgRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const commit = (index, point) =>
    setPositions((prev) => prev.map((p, i) => (i === index ? toModel(point) : p)))

  const startDrag = (index, event) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const pointer = pointerPosition(event)
    const origin = points[index]
    setDrag({
      index,
      offset: { x: pointer.x - origin.x, y: pointer.y - origin.y },
      point: origin,
      valid: true,
      lastValid: origin,
    })
  }

  const moveDrag = (event) => {
    if (!drag) return
    const pointer = pointerPosition(event)
    const point = keepInside({ x: pointer.x - drag.offset.x, y: pointer.y - drag.offset.y })
    const valid = isValid(drag.index, point)
    setDrag({ ...drag, point, valid, lastValid: valid ? point : drag.lastValid })
  }

  const endDrag = () => {
    if (!drag) return
    commit(drag.index, drag.lastValid)
    setDrag(null)
  }

  const nudge = (index, event) => {
    const direction = ARROWS[event.key]
    if (!direction) return
    event.preventDefault()
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP
    const point = keepInside({
      x: points[index].x + direction[0] * step,
      y: points[index].y + direction[1] * step,
    })
    if (isValid(index, point)) {
      commit(index, point)
      setRejected(null)
    } else {
      setRejected(index)
      window.setTimeout(() => setRejected((current) => (current === index ? null : current)), 450)
    }
  }

  const invalidIndex = drag && !drag.valid ? drag.index : rejected
  const activeIndex = drag ? drag.index : shown

  const edgeClass = (a, b) => {
    if (invalidIndex === a || invalidIndex === b) return 'edge invalid'
    if (activeIndex === a || activeIndex === b) return 'edge active'
    return 'edge'
  }

  const nodeClass = (index) =>
    [
      'node',
      index === invalidIndex && 'invalid',
      index === activeIndex && 'active',
      drag?.index === index && 'dragging',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <svg
      ref={svgRef}
      className={`lattice${drag ? ' is-dragging' : ''}`}
      role="group"
      aria-label={`Concept lattice with ${lattice.nodes.length} concepts`}
    >
      {frame &&
        lattice.edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            className={edgeClass(a, b)}
            x1={points[a].x}
            y1={points[a].y}
            x2={points[b].x}
            y2={points[b].y}
          />
        ))}
      {frame &&
        lattice.nodes.map((node, index) => (
          <g
            key={index}
            className={nodeClass(index)}
            style={{ transform: `translate(${points[index].x}px, ${points[index].y}px)` }}
            tabIndex={0}
            role="button"
            aria-label={[
              node.attributeLabels.length && `Attributes ${node.attributeLabels.join(', ')}`,
              node.objectLabels.length && `Objects ${node.objectLabels.join(', ')}`,
            ]
              .filter(Boolean)
              .join('; ') || `Concept ${index + 1}`}
            onPointerDown={(event) => startDrag(index, event)}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerEnter={() => setHovered(index)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setFocused(index)}
            onBlur={() => setFocused(null)}
            onKeyDown={(event) => nudge(index, event)}
          >
            <circle className="node-hit" r={NODE_RADIUS + 9} />
            <circle className="node-dot" r={NODE_RADIUS} />
            {node.attributeLabels.length > 0 && (
              <text className="node-label attribute" y={-(NODE_RADIUS + 8)}>
                {node.attributeLabels.join(', ')}
              </text>
            )}
            {node.objectLabels.length > 0 && (
              <text className="node-label object" y={NODE_RADIUS + 18}>
                {node.objectLabels.join(', ')}
              </text>
            )}
          </g>
        ))}
    </svg>
  )
}

export default LatticeDiagram
