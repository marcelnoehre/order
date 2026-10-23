import init, { draw } from '../../wasm/pkg/order_draw.js'

self.Window ??= self.constructor

const ready = init()

self.onmessage = async ({ data: { id, algorithm, context, options } }) => {
  try {
    await ready
    const started = performance.now()
    const lattice = draw(algorithm, context, options)
    self.postMessage({ id, ok: true, value: { lattice, ms: performance.now() - started } })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error?.message ?? String(error) })
  }
}
