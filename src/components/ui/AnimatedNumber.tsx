import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

const defaultFormat = (n: number) => Math.round(n).toLocaleString('en-IN')

/** Counts up to `value` when it scrolls into view, and tweens between later values. */
export function AnimatedNumber({ value, format = defaultFormat, className, duration = 1.4 }: {
  value: number
  format?: (n: number) => string
  className?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const formatRef = useRef(format)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()

  useEffect(() => {
    formatRef.current = format
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !inView) return
    if (reduced) {
      shown.current = value
      el.textContent = formatRef.current(value)
      return
    }
    const controls = animate(shown.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        shown.current = n
        el.textContent = formatRef.current(n)
      },
    })
    return () => controls.stop()
  }, [value, inView, reduced, duration])

  return (
    <span ref={ref} className={className}>
      {format(reduced ? value : 0)}
    </span>
  )
}
