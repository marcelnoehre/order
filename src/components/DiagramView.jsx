import { useState } from 'react'
import LatticeDiagram from './LatticeDiagram.jsx'

const LIST_LIMIT = 8

function formatList(names) {
  if (!names.length) return '∅'
  if (names.length <= LIST_LIMIT) return names.join(', ')
  return `${names.slice(0, LIST_LIMIT).join(', ')} +${names.length - LIST_LIMIT} more`
}

function describeBudget({ timeoutMs }) {
  if (timeoutMs === undefined) return ''
  return timeoutMs === null ? ' · unbounded' : ` · budget ${timeoutMs} ms`
}

function describeResult({ drawing, parameters, status, lattice, ms, message }) {
  if (status === 'running') return `${drawing.name} · drawing…${describeBudget(parameters)}`
  if (status === 'error') return `${drawing.name} failed: ${message}`
  if (!lattice) return `${drawing.name} · nothing to draw`
  return `${drawing.name} · ${lattice.nodes.length} concepts · ${Math.round(ms)} ms${describeBudget(parameters)}`
}

function DiagramView({ result, names, stale, onRedraw }) {
  const [hovered, setHovered] = useState(null)
  const [layout, setLayout] = useState(0)
  const [edited, setEdited] = useState(false)
  const concept = hovered !== null ? result.lattice?.nodes[hovered] : null

  return (
    <div className="diagram">
      <div className="diagram-bar">
        <span className={`diagram-caption ${result.status}`}>{describeResult(result)}</span>
        {stale && (
          <span className="diagram-stale">
            Context changed
            <button className="text-button" onClick={onRedraw}>
              Redraw
            </button>
          </span>
        )}
        {result.lattice && (
          <button
            className="btn btn-small"
            onClick={() => setLayout((n) => n + 1)}
            disabled={!edited}
            title={edited ? undefined : 'No nodes have been moved'}
          >
            Reset layout
          </button>
        )}
      </div>

      <div className={`diagram-canvas${stale ? ' stale' : ''}`}>
        {result.lattice ? (
          <LatticeDiagram
            key={layout}
            lattice={result.lattice}
            onHover={setHovered}
            onEdit={setEdited}
          />
        ) : (
          <p className={`diagram-message ${result.status}`}>
            {result.status === 'running' ? 'Computing the layout…' : describeResult(result)}
          </p>
        )}
      </div>

      <p className="diagram-info">
        {concept ? (
          <>
            <span className="diagram-info-key">Extent</span>
            {formatList(concept.extent.map((g) => names.objects[g]))}
            <span className="diagram-info-key">Intent</span>
            {formatList(concept.intent.map((m) => names.attributes[m]))}
          </>
        ) : (
          'Drag a node or use the arrow keys to refine the layout. Positions that break the order are blocked.'
        )}
      </p>
    </div>
  )
}

export default DiagramView
