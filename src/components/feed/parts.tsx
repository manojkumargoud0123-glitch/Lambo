import { Flag } from 'lucide-react'
import { MODEL_IMAGE, SITE_BY_ID } from '@/data/catalog'
import { VEHICLE_BY_ID } from '@/data/fleet'
import { minutesLabel, timeLabel } from '@/lib/format'
import { cn } from '@/lib/cn'

export function TimeBlock({ start, end, minutes }: { start: Date; end: Date; minutes?: number }) {
  return (
    <div className="w-[76px] shrink-0 tabular-nums">
      <p className="text-[19px] font-light leading-none text-ink">{timeLabel(start)}</p>
      <p className="mt-1.5 text-[11px] text-muted">to {timeLabel(end)}</p>
      {minutes !== undefined && <p className="mt-0.5 text-[11px] text-gold">{minutesLabel(minutes)}</p>}
    </div>
  )
}

export function VehicleChip({ vehicleId, code, sub }: { vehicleId: string; code: string; sub?: string }) {
  const v = VEHICLE_BY_ID[vehicleId]
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative h-11 w-[70px] shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(120%_100%_at_50%_100%,var(--surface-3),transparent)]">
        <img src={MODEL_IMAGE[v.model.id]} alt="" loading="lazy" className="absolute inset-x-1 bottom-1 w-[calc(100%-8px)] object-contain transition-transform duration-500 ease-lux group-hover:scale-110" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate font-wide text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink">{code}</span>
        <span className="mt-0.5 block truncate text-[12px] text-muted">{sub ?? `${v.model.short} · ${SITE_BY_ID[v.siteId].name}`}</span>
      </span>
    </div>
  )
}

/** Origin ●┄┄┄┄⚑ destination. */
export function RouteLine({ from, to, className }: { from: string; to: string; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3 text-[13px]', className)}>
      <span className="flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-moving ring-4 ring-moving/15" />
        <span className="truncate text-ink-2">{from}</span>
      </span>
      <span className="relative h-px min-w-8 flex-1 bg-[repeating-linear-gradient(90deg,var(--line-strong)_0_4px,transparent_4px_8px)]">
        <span className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-gold/0 to-gold transition-[width] duration-700 ease-lux group-hover:w-full" />
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Flag className="size-3.5 shrink-0 text-gold" />
        <span className="truncate text-ink">{to}</span>
      </span>
    </div>
  )
}

/** A small battery glyph whose fill spans start → end state of charge. */
export function BatteryGlyph({ start, end, className }: { start: number; end: number; className?: string }) {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const charging = end > start
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="relative h-5 flex-1 overflow-hidden rounded-[6px] border border-line-strong p-[2px]">
        <div className="absolute inset-[2px] rounded-[4px] bg-surface-3/60" />
        <div
          className="absolute inset-y-[2px] rounded-[4px]"
          style={{
            left: `calc(${lo}% * 0.98 + 2px)`,
            width: `calc(${hi - lo}% * 0.98)`,
            background: charging ? 'linear-gradient(90deg, color-mix(in oklab, var(--charging) 55%, transparent), var(--charging))' : 'linear-gradient(90deg, var(--gold), color-mix(in oklab, var(--gold) 45%, transparent))',
          }}
        />
        <div className="relative flex h-full items-center justify-between px-1.5 text-[10px] tabular-nums text-ink">
          <span>{start}%</span>
          <span>{end}%</span>
        </div>
      </div>
      <span className="h-2 w-[3px] rounded-r-sm bg-line-strong" />
    </div>
  )
}

export function Metric({ value, unit, label, className }: { value: string; unit?: string; label: string; className?: string }) {
  return (
    <div className={cn('text-right tabular-nums', className)}>
      <p className="text-[15px] text-ink">
        {value}
        {unit && <span className="ml-1 text-[11px] text-muted">{unit}</span>}
      </p>
      <p className="eyebrow mt-1 text-[7.5px]">{label}</p>
    </div>
  )
}
