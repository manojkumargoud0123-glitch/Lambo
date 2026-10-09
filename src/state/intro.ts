/** One-shot signal: fires when the brand intro starts lifting (or immediately if it was skipped). */
let finished = false
const waiting = new Set<() => void>()

export function finishIntro() {
  if (finished) return
  finished = true
  waiting.forEach((cb) => cb())
  waiting.clear()
}

export function onIntroFinished(cb: () => void) {
  if (finished) {
    cb()
    return () => {}
  }
  waiting.add(cb)
  return () => {
    waiting.delete(cb)
  }
}
