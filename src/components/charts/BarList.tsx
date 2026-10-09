import { motion } from 'motion/react'
import type { ReactNode } from 'react'

/** Horizontal bars with the label above and the value at the tip — one series, one colour. */
export function BarList({ items, format, unit }: {
  items: { key: string; label: ReactNode; sub?: ReactNode; value: number; color?: string }[]
  format: (n: number) => string
  unit?: string
}) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="space-y-4">
      {items.map((item, i) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink-2">
              {item.label}
              {item.sub && <span className="ml-2 text-[11px] text-muted">{item.sub}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-ink">
              {format(item.value)}
              {unit && <span className="ml-1 text-[11px] text-muted">{unit}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: item.color ?? 'var(--gold)' }}
              initial={{ width: 0 }}
              whileInView={{ width: `${(item.value / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
