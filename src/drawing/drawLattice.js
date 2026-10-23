let worker = null
let nextId = 0
const pending = new Map()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./draw.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data: { id, ok, value, error } }) => {
      const request = pending.get(id)
      pending.delete(id)
      if (ok) request.resolve(value)
      else request.reject(new Error(error))
    }
  }
  return worker
}

export function cancelDrawing() {
  if (!pending.size) return
  worker.terminate()
  worker = null
  pending.forEach(({ reject }) => reject(new Error('Drawing cancelled')))
  pending.clear()
}

export function preloadDrawing() {
  getWorker()
}

export function drawLattice(algorithm, context, { timeoutMs = 1000 } = {}) {
  cancelDrawing()
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, algorithm, context, timeoutMs })
  })
}
