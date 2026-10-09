import { memo } from 'react'
import { MODEL_IMAGE } from '@/data/catalog'
import { VEHICLE_BY_ID } from '@/data/fleet'
import type { ChargeSession, ParkingEvent, Trip } from '@/data/types'
import { minutesLabel, timeLabel } from '@/lib/format'

export interface Lane {
  vehicleId: string
  code: string
  parks: ParkingEvent[]
  trips: Trip[]
  charges: ChargeSession[]
}

const START_H = 6
const END_H = 23
const SPAN = (END_H - START_H) * 3_600_000

/** One lane per cart across the operating day: parked (gold), driving (line), charging (blue). */
export const DayTimeline = memo(function DayTimeline({ lanes, day, now }: { lanes: Lane[]; day: Date; now?: Date }) {
  const origin = day.getTime() + START_H * 3_600_000
  const pos = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - origin) / SPAN) * 100))
  const width = (a: Date, b: Date) => Math.max(0.35, pos(b) - pos(a))
  const ticks = Array.from({ length: (END_H - START_H) / 2 + 1 }, (_, i) => START_H + i * 2)
  const nowPct = now && now.getTime() > origin && now.getTime() < origin + SPAN ? pos(now) : null

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="relative ml-[168px] h-6 border-b border-line">
          {ticks.map((h) => (
            <span key={h} className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted" style={{ left: `${((h - START_H) / (END_H - START_H)) * 100}%` }}>
              {String(h).padStart(2, '0')}:00
            </span>
          ))}
        </div>
        <div className="relative">
          {nowPct !== null && (
            <div className="pointer-events-none absolute inset-y-0 z-10 ml-[168px] w-[calc(100%-168px)]">
              <div className="absolute inset-y-0 w-px bg-accent" style={{ left: `${nowPct}%` }}>
                <span className="absolute -top-1 left-1 rounded-full bg-accent px-1.5 py-px font-wide text-[7.5px] uppercase tracking-[0.14em] text-white">Now</span>
              </div>
            </div>
          )}
          {lanes.map((lane, i) => {
            const v = VEHICLE_BY_ID[lane.vehicleId]
            return (
              <div key={lane.vehicleId} className="rise flex h-12 items-center border-b border-line/60" style={{ animationDelay: `${i * 35}ms` }}>
                <div className="flex w-[168px] shrink-0 items-center gap-2.5 pr-3">
                  <img src={MODEL_IMAGE[v.model.id]} alt="" className="h-6 w-10 object-contain" />
                  <span className="truncate font-wide text-[9.5px] uppercase tracking-[0.06em] text-ink-2">{lane.code}</span>
                </div>
                <div className="relative h-full flex-1">
                  {ticks.map((h) => (
                    <span key={h} className="absolute inset-y-0 w-px bg-line/60" style={{ left: `${((h - START_H) / (END_H - START_H)) * 100}%` }} />
                  ))}
                  {lane.trips.map((t) => (
                    <span
                      key={t.id}
                      title={`${timeLabel(t.start)}–${timeLabel(t.end)} · ${t.from} → ${t.to}`}
                      className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-ink-2/70"
                      style={{ left: `${pos(t.start)}%`, width: `${width(t.start, t.end)}%` }}
                    />
                  ))}
                  {lane.parks.map((p) => (
                    <span
                      key={p.id}
                      title={`Parked ${minutesLabel(p.durationMin)} at ${p.location} · ${timeLabel(p.start)}–${timeLabel(p.end)}`}
                      className="absolute top-1/2 h-4 -translate-y-1/2 rounded-[5px] bg-gold/85 ring-1 ring-inset ring-black/10 transition-[filter] hover:brightness-125"
                      style={{ left: `${pos(p.start)}%`, width: `${width(p.start, p.end)}%` }}
                    />
                  ))}
                  {lane.charges.map((c) => (
                    <span
                      key={c.id}
                      title={`Charging ${c.startSoc}→${c.endSoc}% · ${timeLabel(c.start)}–${timeLabel(c.end)}`}
                      className="absolute top-1/2 h-4 -translate-y-1/2 rounded-[5px] bg-charging"
                      style={{ left: `${pos(c.start)}%`, width: `${width(c.start, c.end)}%` }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5 pl-[168px] text-[12px] text-muted">
          <span className="flex items-center gap-2">
            <span className="h-3 w-6 rounded-[4px] bg-gold/85" /> Parked
          </span>
          <span className="flex items-center gap-2">
            <span className="h-[2px] w-6 rounded-full bg-ink-2/70" /> Driving
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-6 rounded-[4px] bg-charging" /> Charging
          </span>
        </div>
      </div>
    </div>
  )
})
