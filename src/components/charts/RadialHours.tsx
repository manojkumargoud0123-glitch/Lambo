import { memo, useState } from 'react'

/**
 * 24-hour clock: one radial bar per hour, length ∝ value. Single series, so one hue;
 * the peak hour is emphasised and the centre reads out whatever is hovered.
 */
export const RadialHours = memo(function RadialHours({ values, unit, size = 340 }: { values: number[]; unit: string; size?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...values)
  const peak = values.indexOf(Math.max(...values))
  const total = values.reduce((a, b) => a + b, 0)
  const c = 170
  const inner = 74
  const span = 82
  const shown = hover ?? peak

  return (
    <svg viewBox="0 0 340 340" width="100%" style={{ maxWidth: size }} className="mx-auto block" role="img" aria-label={`${unit} by hour of day`}>
      <circle cx={c} cy={c} r={inner + span} fill="none" stroke="var(--grid)" />
      <circle cx={c} cy={c} r={inner + span / 2} fill="none" stroke="var(--grid)" strokeDasharray="0" />
      <circle cx={c} cy={c} r={inner - 8} fill="var(--surface-2)" stroke="var(--line)" />
      {values.map((v, h) => {
        const len = Math.max(2, (v / max) * span)
        const active = h === shown
        return (
          <g key={h} transform={`rotate(${h * 15} ${c} ${c})`} onPointerEnter={() => setHover(h)} onPointerLeave={() => setHover(null)}>
            <rect x={c - 9} y={c - inner - span - 4} width={18} height={span + 8} fill="transparent" />
            <rect
              x={c - 4.5}
              y={c - inner - len}
              width={9}
              height={len}
              rx={4}
              className="grow-up"
              style={{ animationDelay: `${h * 28}ms`, transformOrigin: `${c}px ${c - inner}px` }}
              fill={active ? 'var(--gold)' : 'color-mix(in oklab, var(--gold) 55%, var(--surface-3))'}
            />
          </g>
        )
      })}
      {[0, 6, 12, 18].map((h) => {
        const a = ((h * 15 - 90) * Math.PI) / 180
        const r = inner + span + 18
        return (
          <text key={h} x={c + Math.cos(a) * r} y={c + Math.sin(a) * r + 4} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="Kanit">
            {String(h).padStart(2, '0')}:00
          </text>
        )
      })}
      <text x={c} y={c - 14} textAnchor="middle" fontSize="9" letterSpacing="2.5" fill="var(--muted)" fontFamily="Georama" style={{ fontVariationSettings: "'wdth' 150" }}>
        {hover === null ? 'PEAK' : 'HOUR'} {String(shown).padStart(2, '0')}:00
      </text>
      <text x={c} y={c + 16} textAnchor="middle" fontSize="30" fontWeight="200" fill="var(--ink)" fontFamily="Kanit">
        {values[shown]}
      </text>
      <text x={c} y={c + 34} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="Kanit">
        of {total.toLocaleString('en-IN')} {unit}
      </text>
    </svg>
  )
})
