import { motion } from 'motion/react'
import { AnimatedNumber } from './AnimatedNumber'

/** 240° arc meter. The fill carries the value; the track is a quiet step of the surface. */
export function Gauge({ value, max, label, unit, format, color = 'var(--gold)', size = 148 }: {
  value: number
  max: number
  label: string
  unit?: string
  format?: (n: number) => string
  color?: string
  size?: number
}) {
  const r = 52
  const sweep = 240
  const circumference = 2 * Math.PI * r
  const arc = (sweep / 360) * circumference
  const pct = Math.max(0, Math.min(1, max ? value / max : 0))

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.82 }}>
        <svg viewBox="0 0 128 112" className="size-full -rotate-0" aria-hidden>
          <g transform="rotate(150 64 64)">
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${arc} ${circumference}`} />
            <motion.circle
              cx="64"
              cy="64"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${circumference}`}
              initial={{ strokeDashoffset: arc }}
              whileInView={{ strokeDashoffset: arc * (1 - pct) }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
          <p className="flex items-baseline gap-1">
            <AnimatedNumber value={value} format={format} className="text-[26px] font-light leading-none text-ink" />
            {unit && <span className="text-[11px] text-muted">{unit}</span>}
          </p>
        </div>
      </div>
      <p className="eyebrow -mt-2 text-center">{label}</p>
    </div>
  )
}

/** Start → end state-of-charge bar used in tables. */
export function SocBar({ start, end, className }: { start: number; end: number; className?: string }) {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const charging = end > start
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-[11px] tabular-nums text-ink-2">
        <span>{start}%</span>
        <span className="text-muted">→</span>
        <span>{end}%</span>
      </div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-3">
        <div className="absolute inset-y-0 rounded-full" style={{ left: `${lo}%`, width: `${hi - lo}%`, background: charging ? 'var(--charging)' : 'var(--gold)' }} />
      </div>
    </div>
  )
}

/** Horizontal battery meter with severity colouring. */
export function BatteryMeter({ soc, className }: { soc: number; className?: string }) {
  const color = soc < 20 ? 'var(--bad)' : soc < 40 ? 'var(--idle)' : 'var(--good)'
  return (
    <div className={className}>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color }}
          initial={false}
          animate={{ width: `${soc}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}
