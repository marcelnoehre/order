import { useEffect, useRef, useState } from 'react'
import { ChevronIcon } from './Icons.jsx'
import { resetParameters, setParameter } from '../drawing/parameters.js'

function BudgetField({ parameter, value, onChange }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const unbounded = value === null

  const commit = () => {
    const number = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(number)) {
      setDraft(String(value))
      return
    }
    const next = Math.max(parameter.min, Math.round(number))
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return (
    <div className="parameter-row">
      <span className="parameter-input">
        <input
          type="number"
          inputMode="numeric"
          min={parameter.min}
          step={parameter.step}
          value={draft}
          disabled={unbounded}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-label={`${parameter.label} in milliseconds`}
        />
        <span className="parameter-unit">ms</span>
      </span>
      <label className="switch switch-small">
        <input
          type="checkbox"
          role="switch"
          checked={unbounded}
          onChange={(e) => onChange(e.target.checked ? null : parameter.default)}
        />
        <span className="switch-track" aria-hidden="true" />
        Unbounded
      </label>
    </div>
  )
}

function ParameterField({ parameter, value, onChange }) {
  if (parameter.type === 'budget') {
    return <BudgetField key={String(value)} parameter={parameter} value={value} onChange={onChange} />
  }
  if (parameter.type === 'select') {
    return (
      <select
        className="parameter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={parameter.label}
      >
        {parameter.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  return (
    <label className="switch switch-small">
      <input
        type="checkbox"
        role="switch"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
      {value ? 'On' : 'Off'}
    </label>
  )
}

function DrawButton({ drawing, values, disabled, title, onDraw }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event) => {
      if (!rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const isDefault = drawing.parameters.every((parameter) => values[parameter.id] === parameter.default)

  return (
    <div className="draw-button" ref={rootRef}>
      <button className="btn btn-accent draw-main" onClick={onDraw} disabled={disabled} title={title}>
        {drawing.name}
      </button>
      <button
        className={`btn btn-accent draw-toggle${isDefault ? '' : ' customised'}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`${drawing.name} parameters`}
        title={`${drawing.name} parameters`}
      >
        <ChevronIcon className={`chevron${open ? ' up' : ''}`} />
      </button>
      {open && (
        <div className="parameter-panel" role="dialog" aria-label={`${drawing.name} parameters`}>
          <p className="parameter-title">{drawing.name} parameters</p>
          {drawing.parameters.map((parameter) => (
            <div key={parameter.id} className="parameter">
              <span className="parameter-label">{parameter.label}</span>
              <ParameterField
                parameter={parameter}
                value={values[parameter.id]}
                onChange={(value) => setParameter(drawing.id, parameter.id, value)}
              />
              {parameter.hint && <p className="parameter-hint">{parameter.hint}</p>}
            </div>
          ))}
          <button
            className="text-button parameter-reset"
            onClick={() => resetParameters(drawing.id)}
            disabled={isDefault}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  )
}

export default DrawButton
