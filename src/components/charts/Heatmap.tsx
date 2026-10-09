import { memo, useState } from 'react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Sequential single-hue ramp (surface → gold), so magnitude reads in both themes. */
const shade = (t: number) => (t <= 0 ? 'var(--surface-2)' : `color-mix(in oklab, var(--gold) ${Math.round(12 + t * 88)}%, var(--surface-2))`)

/** Weekday × hour grid. Cells fade in with a staggered CSS keyframe (no per-cell JS animation). */
export const Heatmap = memo(function Heatmap({ grid, max, hours = [6, 23] }: { grid: number[][]; max: number; hours?: [number, number] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  const cols = Array.from({ length: hours[1] - hours[0] + 1 }, (_, i) => hours[0] + i)

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[620px]" onPointerLeave={() => setHover(null)}>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `40px repeat(${cols.length}, minmax(0, 1fr))` }}>
            <span />
            {cols.map((h) => (
              <span key={h} className="pb-1.5 text-center text-[10px] tabular-nums text-muted">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </span>
            ))}
            {grid.map((row, d) => (
              <Row key={d} d={d} row={row} cols={cols} max={max} onHover={setHover} />
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 text-[11px] text-muted">
            <span className="tabular-nums">
              {hover ? (
                <>
                  <span className="eyebrow mr-2 text-[8.5px] text-ink-2">
                    {DAYS[hover.d]} · {String(hover.h).padStart(2, '0')}:00
                  </span>
                  <span className="text-ink">{grid[hover.d][hover.h].toLocaleString('en-IN')}</span> trip starts
                </>
              ) : (
                'Hover a cell for detail'
              )}
            </span>
            <span className="flex items-center gap-2">
              Fewer
              {[0.05, 0.25, 0.5, 0.75, 1].map((t) => (
                <span key={t} className="size-3 rounded-[3px]" style={{ background: shade(t) }} />
              ))}
              More
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

const Row = memo(function Row({ d, row, cols, max, onHover }: { d: number; row: number[]; cols: number[]; max: number; onHover: (h: { d: number; h: number }) => void }) {
  return (
    <>
      <span className="self-center text-[11px] text-muted">{DAYS[d]}</span>
      {cols.map((h, i) => (
        <span
          key={h}
          tabIndex={0}
          aria-label={`${DAYS[d]} ${h}:00 — ${row[h]} trips`}
          onPointerEnter={() => onHover({ d, h })}
          onFocus={() => onHover({ d, h })}
          className="pop aspect-[1.3] rounded-[4px] outline-none ring-gold transition-shadow hover:ring-1 focus-visible:ring-1"
          style={{ background: shade(max ? row[h] / max : 0), animationDelay: `${d * 40 + i * 12}ms` }}
        />
      ))}
    </>
  )
})
