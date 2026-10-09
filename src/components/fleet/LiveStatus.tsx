import { motion } from 'motion/react'
import { Link } from 'react-router'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { EASE } from '@/components/ui/motion'
import { STATUS_META, STATUS_ORDER, StatusBadge } from '@/components/ui/status'
import { statusCounts } from '@/data/analytics'
import { useLiveFleet } from '@/state/liveFleet'

/** The only part of the analytics page that subscribes to live telemetry — so only it re-renders each tick. */
export function LiveStatus({ siteId }: { siteId: string }) {
  const live = useLiveFleet()
  const fleet = siteId === 'all' ? live : live.filter((v) => v.siteId === siteId)
  const counts = statusCounts(fleet)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Right now</p>
        <span className="flex items-center gap-2 text-[11px] text-ink-2">
          <span className="relative flex size-2">
            <span className="pulse-ring absolute inset-0 rounded-full bg-good" />
            <span className="relative size-2 rounded-full bg-good" />
          </span>
          Live
        </span>
      </div>
      <p className="mt-4 flex items-baseline gap-2">
        <AnimatedNumber value={fleet.length} className="text-5xl font-extralight text-ink" />
        <span className="text-sm text-muted">vehicles</span>
      </p>
      <div className="mt-5 flex h-2 gap-[2px] overflow-hidden rounded-full">
        {STATUS_ORDER.map((k) =>
          counts[k] ? (
            <motion.span
              key={k}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ background: STATUS_META[k].color }}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: counts[k] }}
              transition={{ duration: 1, ease: EASE }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {STATUS_ORDER.map((k) => (
          <li key={k} className="flex items-center justify-between text-[13px]">
            <StatusBadge status={k} size="sm" />
            <span className="tabular-nums text-ink">
              {counts[k]}
              <span className="ml-2 inline-block w-10 text-right text-muted">{fleet.length ? Math.round((counts[k] / fleet.length) * 100) : 0}%</span>
            </span>
          </li>
        ))}
      </ul>
      <Link to="/" className="mt-6 block rounded-full border border-line py-2.5 text-center font-wide text-[9.5px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold-wash">
        Open live map
      </Link>
    </div>
  )
}
