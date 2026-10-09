/** Ordinal ramp on the gold hue — ordered bins (low → high). Nearest-to-surface step still clears 2:1. */
export const ORDINAL_GOLD = [
  'color-mix(in oklab, var(--gold) 38%, var(--surface-3))',
  'color-mix(in oklab, var(--gold) 60%, var(--surface-3))',
  'color-mix(in oklab, var(--gold) 80%, var(--surface-3))',
  'var(--gold)',
]

export const ORDINAL_GOLD_5 = [
  'color-mix(in oklab, var(--gold) 34%, var(--surface-3))',
  'color-mix(in oklab, var(--gold) 52%, var(--surface-3))',
  'color-mix(in oklab, var(--gold) 68%, var(--surface-3))',
  'color-mix(in oklab, var(--gold) 84%, var(--surface-3))',
  'var(--gold)',
]
