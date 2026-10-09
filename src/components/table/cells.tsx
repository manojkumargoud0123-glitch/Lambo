import { MODEL_IMAGE, SITE_BY_ID } from '@/data/catalog'
import { VEHICLE_BY_ID } from '@/data/fleet'
import { cn } from '@/lib/cn'

export function VehicleCell({ vehicleId, code }: { vehicleId: string; code: string }) {
  const v = VEHICLE_BY_ID[vehicleId]
  return (
    <span className="flex items-center gap-3">
      <span className="relative h-8 w-12 shrink-0">
        <img src={MODEL_IMAGE[v.model.id]} alt="" loading="lazy" className="absolute inset-0 size-full object-contain transition-transform duration-500 group-hover:scale-110" />
      </span>
      <span className="leading-tight">
        <span className="block font-wide text-[10px] font-medium uppercase tracking-[0.08em] text-ink">{code}</span>
        <span className="block text-[11px] text-muted">{v.model.short}</span>
      </span>
    </span>
  )
}

export function SiteCell({ siteId }: { siteId: string }) {
  const s = SITE_BY_ID[siteId]
  return (
    <span className="leading-tight">
      <span className="block text-ink-2">{s.name}</span>
      <span className="block text-[11px] text-muted">{s.city}</span>
    </span>
  )
}

export function Pill({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 px-2.5 py-1 text-[11px] text-ink-2', className)}>
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  )
}
