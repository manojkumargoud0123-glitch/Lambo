import { motion } from 'motion/react'
import { STATUS_META, STATUS_ORDER } from '@/components/ui/status'
import type { Site, Vehicle, VehicleStatus } from '@/data/types'
import { cn } from '@/lib/cn'

export function VehiclePin({ vehicle, selected, onClick }: { vehicle: Vehicle; selected: boolean; onClick: () => void }) {
  const meta = STATUS_META[vehicle.status]
  const Icon = meta.icon
  const hollow = vehicle.status === 'offline'
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="group relative grid cursor-pointer place-items-center"
      aria-label={`${vehicle.code}, ${meta.label}`}
    >
      {vehicle.status === 'moving' && <span className="pulse-ring absolute size-8 rounded-full" style={{ background: meta.color }} />}
      {selected && (
        <motion.span
          layoutId="pin-halo"
          className="absolute size-14 rounded-full border border-gold/70 bg-gold-wash"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: selected ? 1.18 : 1 }}
        whileHover={{ scale: 1.25 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn('relative grid size-8 place-items-center rounded-full border-2 shadow-[0_6px_18px_-4px_rgba(0,0,0,0.6)]', hollow ? 'bg-surface' : '')}
        style={{ background: hollow ? undefined : meta.color, borderColor: hollow ? meta.color : 'var(--surface)' }}
      >
        <Icon
          className="size-3.5"
          strokeWidth={2.6}
          style={{ color: hollow ? meta.color : '#fff', transform: vehicle.status === 'moving' ? `rotate(${vehicle.heading}deg)` : undefined }}
        />
      </motion.span>
      <span
        className={cn(
          'glass pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          selected && 'opacity-100',
        )}
      >
        <span className="font-normal">{vehicle.code}</span>
        {vehicle.status === 'moving' && <span className="ml-1.5 text-muted">{vehicle.speed} km/h</span>}
      </span>
    </button>
  )
}

export function SitePin({ site, counts, onClick }: { site: Site; counts: Record<VehicleStatus, number>; onClick: () => void }) {
  const total = STATUS_ORDER.reduce((s, k) => s + counts[k], 0)
  const gap = total > 1 ? 1.6 : 0
  let acc = 0
  const stops: string[] = []
  for (const k of STATUS_ORDER) {
    if (!counts[k]) continue
    const share = (counts[k] / total) * 100
    stops.push(`${STATUS_META[k].color} ${acc}% ${acc + share - gap}%`, `transparent ${acc + share - gap}% ${acc + share}%`)
    acc += share
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="group flex cursor-pointer flex-col items-center gap-2"
      aria-label={`${site.name}: ${total} vehicles`}
    >
      <motion.span
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="relative grid size-[62px] place-items-center rounded-full p-[3px] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
        style={{ background: total ? `conic-gradient(${stops.join(', ')})` : 'var(--surface-3)' }}
      >
        <span className="grid size-full place-items-center rounded-full bg-surface">
          <span className="text-xl font-light leading-none text-ink">{total}</span>
        </span>
      </motion.span>
      <span className="glass whitespace-nowrap rounded-full px-3 py-1.5 text-center leading-tight">
        <span className="block font-wide text-[9px] font-medium uppercase tracking-[0.18em] text-ink">{site.name}</span>
        <span className="block text-[10px] text-muted">{site.city}</span>
      </span>
    </button>
  )
}
