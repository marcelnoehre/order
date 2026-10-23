import { useState } from 'react'
import EditableLabel from './EditableLabel.jsx'
import { CrossIcon, PlusIcon } from './Icons.jsx'
import { toCxt, toCsv, downloadFile } from '../utils/exportContext.js'
import { drawings } from '../data/drawings.js'

const INITIAL_SIZE = 5
const DEFAULT_TITLE = 'Formal Context'
const DEFAULT_FILENAME = 'context'

const toFilename = (title) =>
  title
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.(cxt|csv)$/i, '')
    .trim() || DEFAULT_FILENAME

const TRUE_VALUE = 'True'
const FALSE_VALUE = 'False'

const normalize = (value) => value.trim().toLowerCase()
const isTrue = (value) => normalize(value) === normalize(TRUE_VALUE)
const isBinary = (value) =>
  ['', normalize(TRUE_VALUE), normalize(FALSE_VALUE)].includes(normalize(value))

const createItems = (prefix, n) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `${prefix}${i + 1}` }))

const formatTitle = (name) => (
  <>
    <span className="title-text">{name}</span>
    <svg className="edit-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
    </svg>
  </>
)

function ContextTable({ initialContext }) {
  const [objects, setObjects] = useState(
    () => initialContext?.objects ?? createItems('g', INITIAL_SIZE),
  )
  const [attributes, setAttributes] = useState(
    () => initialContext?.attributes ?? createItems('m', INITIAL_SIZE),
  )
  const [incidence, setIncidence] = useState(() => new Set(initialContext?.incidence))
  const [title, setTitle] = useState(initialContext?.name ?? null)
  const [atTop, setAtTop] = useState(true)
  const [manyValued, setManyValued] = useState(initialContext?.manyValued ?? false)
  const [values, setValues] = useState(() => new Map(initialContext?.values))

  const key = (g, m) => `${g}:${m}`

  const toggle = (g, m) => {
    setIncidence((prev) => {
      const next = new Set(prev)
      const k = key(g, m)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const valueAt = (g, m) => values.get(key(g, m)) ?? ''

  const setValue = (g, m, value) =>
    setValues((prev) => new Map(prev).set(key(g, m), value))

  const toManyValued = () => {
    const next = new Map()
    for (const g of objects) {
      for (const m of attributes) {
        next.set(key(g.id, m.id), incidence.has(key(g.id, m.id)) ? TRUE_VALUE : FALSE_VALUE)
      }
    }
    setValues(next)
    setManyValued(true)
  }

  const toBinary = () => {
    const lossy = [...values.values()].some((value) => !isBinary(value))
    if (
      lossy &&
      !window.confirm(
        `Only "${TRUE_VALUE}" values become incidences; all other values will be lost. Continue?`,
      )
    ) {
      return
    }
    setIncidence(new Set([...values].filter(([, value]) => isTrue(value)).map(([k]) => k)))
    setValues(new Map())
    setManyValued(false)
  }

  const nextId = (list) => (list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1)

  const addItem = (setList, prefix) =>
    setList((prev) => {
      const id = nextId(prev)
      return [...prev, { id, name: `${prefix}${id}` }]
    })

  const addObject = () => addItem(setObjects, 'g')
  const addAttribute = () => addItem(setAttributes, 'm')

  const renameItem = (setList, id, name) =>
    setList((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)))

  const removeObject = (g) => {
    const keep = (k) => !k.startsWith(`${g}:`)
    setObjects((prev) => prev.filter((o) => o.id !== g))
    setIncidence((prev) => new Set([...prev].filter(keep)))
    setValues((prev) => new Map([...prev].filter(([k]) => keep(k))))
  }

  const removeAttribute = (m) => {
    const keep = (k) => !k.endsWith(`:${m}`)
    setAttributes((prev) => prev.filter((a) => a.id !== m))
    setIncidence((prev) => new Set([...prev].filter(keep)))
    setValues((prev) => new Map([...prev].filter(([k]) => keep(k))))
  }

  const has = (g, m) => incidence.has(key(g.id, m.id))

  const filename = title ? toFilename(title) : DEFAULT_FILENAME

  const exportCxt = () =>
    downloadFile(toCxt(objects, attributes, has), `${filename}.cxt`, 'text/plain')
  const exportCsv = () => {
    const valueOf = manyValued
      ? (g, m) => valueAt(g.id, m.id)
      : (g, m) => (has(g, m) ? '1' : '0')
    downloadFile(toCsv(objects, attributes, valueOf), `${filename}.csv`, 'text/csv')
  }

  const filledValues = objects.reduce(
    (count, g) => count + attributes.filter((m) => valueAt(g.id, m.id).trim() !== '').length,
    0,
  )

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>
            <EditableLabel
              name={title ?? DEFAULT_TITLE}
              onRename={setTitle}
              ariaLabel="Context name"
              className="title-name"
              format={formatTitle}
            />
          </h2>
          <p className="subtitle">
            {objects.length} objects × {attributes.length} attributes ·{' '}
            {manyValued ? `${filledValues} values` : `${incidence.size} incidences`}
          </p>
        </div>
        <div className="actions">
          <label className="switch">
            <input
              type="checkbox"
              role="switch"
              checked={manyValued}
              onChange={(e) => (e.target.checked ? toManyValued() : toBinary())}
            />
            <span className="switch-track" aria-hidden="true" />
            Many-valued
          </label>
          <button
            className="btn"
            onClick={exportCxt}
            disabled={manyValued}
            title={manyValued ? 'Many-valued contexts can only be exported as .csv' : undefined}
          >
            Export .cxt
          </button>
          <button className="btn" onClick={exportCsv}>
            Export .csv
          </button>
        </div>
      </div>

      <div className="draw-bar">
        <span className="draw-label">Draw</span>
        {drawings.map((drawing) => (
          <button key={drawing.id} className="btn btn-accent">
            {drawing.name}
          </button>
        ))}
      </div>

      <div className="table-scroll" onScroll={(e) => setAtTop(e.currentTarget.scrollTop === 0)}>
        <table
          className={`context-table${atTop ? ' at-top' : ''}`}
          style={{ '--head-z': attributes.length + 3 }}
        >
          <thead>
            <tr>
              <th className="corner" />
              {attributes.map((m, i) => (
                <th
                  key={m.id}
                  className="label attribute"
                  style={{ zIndex: attributes.length + 2 - i }}
                >
                  <EditableLabel
                    name={m.name}
                    onRename={(name) => renameItem(setAttributes, m.id, name)}
                    ariaLabel="Attribute name"
                  />
                  <button
                    className="remove"
                    onClick={() => removeAttribute(m.id)}
                    aria-label={`Remove attribute ${m.name}`}
                  >
                    <CrossIcon />
                  </button>
                </th>
              ))}
              <th className="add-cell">
                <button className="add" onClick={addAttribute} aria-label="Add attribute">
                  <PlusIcon />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {objects.map((g) => (
              <tr key={g.id}>
                <th className="label object">
                  <EditableLabel
                    name={g.name}
                    onRename={(name) => renameItem(setObjects, g.id, name)}
                    ariaLabel="Object name"
                  />
                  <button
                    className="remove"
                    onClick={() => removeObject(g.id)}
                    aria-label={`Remove object ${g.name}`}
                  >
                    <CrossIcon />
                  </button>
                </th>
                {attributes.map((m) => {
                  if (manyValued) {
                    return (
                      <td key={m.id}>
                        <input
                          className="cell cell-value"
                          value={valueAt(g.id, m.id)}
                          onChange={(e) => setValue(g.id, m.id, e.target.value)}
                          aria-label={`Value of ${g.name} for ${m.name}`}
                        />
                      </td>
                    )
                  }
                  const checked = incidence.has(key(g.id, m.id))
                  return (
                    <td key={m.id}>
                      <button
                        className={`cell${checked ? ' checked' : ''}`}
                        onClick={() => toggle(g.id, m.id)}
                        aria-pressed={checked}
                        aria-label={`${g.name} has ${m.name}`}
                      >
                        {checked && <CrossIcon className="cell-cross" />}
                      </button>
                    </td>
                  )
                })}
                <td />
              </tr>
            ))}
            <tr>
              <th className="add-cell">
                <button className="add" onClick={addObject} aria-label="Add object">
                  <PlusIcon />
                </button>
              </th>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ContextTable
