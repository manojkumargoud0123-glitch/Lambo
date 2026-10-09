import type { Transition, Variants } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const

/** Transform + opacity only: these stay on the compositor and never jank. */
export const lux: Transition = { duration: 0.7, ease: EASE }

/** Parent that staggers its children in. */
export const stagger = (gap = 0.06, delay = 0.05): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: lux },
}
