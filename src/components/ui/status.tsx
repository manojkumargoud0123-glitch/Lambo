import { CircleParking, Navigation2, Pause, WifiOff, Zap, type LucideIcon } from 'lucide-react'
import type { VehicleStatus } from '@/data/types'
import { cn } from '@/lib/cn'

/** Status always ships as colour + icon + label — never colour alone. */
// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_META: Record<VehicleStatus, { label: string; color: string; icon: LucideIcon; description: string }> = {
  moving: { label: 'Moving', color: 'var(--moving)', icon: Navigation2, description: 'On the move' },
  idle: { label: 'Idle', color: 'var(--idle)', icon: Pause, description: 'Powered on, stationary' },
  charging: { label: 'Charging', color: 'var(--charging)', icon: Zap, description: 'Connected to a charger' },
  parked: { label: 'Parked', color: 'var(--parked)', icon: CircleParking, description: 'Powered off' },
  offline: { label: 'Offline', color: 'var(--offline)', icon: WifiOff, description: 'No signal' },
}

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_ORDER: VehicleStatus[] = ['moving', 'idle', 'charging', 'parked', 'offline']

export function StatusBadge({ status, className, size = 'md' }: { status: VehicleStatus; className?: string; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/70 font-normal text-ink-2',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
        className,
      )}
    >
      <span className="relative grid size-3.5 place-items-center rounded-full" style={{ background: meta.color }}>
        <Icon className="size-2.5 text-white" strokeWidth={2.6} />
        {status === 'moving' && <span className="pulse-ring absolute inset-0 rounded-full" style={{ background: meta.color }} />}
      </span>
      {meta.label}
    </span>
  )
}

export function StatusDot({ status, className }: { status: VehicleStatus; className?: string }) {
  return <span className={cn('inline-block size-2 rounded-full', className)} style={{ background: STATUS_META[status].color }} />
}
