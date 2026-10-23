import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'order.drawing-parameters'

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

let stored = read()
const listeners = new Set()

function update(next) {
  stored = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    listeners.forEach((listener) => listener())
    return
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDrawingParameters() {
  return useSyncExternalStore(subscribe, () => stored)
}

export function parametersFor(drawing, all) {
  const saved = all[drawing.id] ?? {}
  return Object.fromEntries(
    drawing.parameters.map((parameter) => [
      parameter.id,
      parameter.id in saved ? saved[parameter.id] : parameter.default,
    ]),
  )
}

export function setParameter(drawingId, parameterId, value) {
  update({ ...stored, [drawingId]: { ...stored[drawingId], [parameterId]: value } })
}

export function resetParameters(drawingId) {
  const next = { ...stored }
  delete next[drawingId]
  update(next)
}
