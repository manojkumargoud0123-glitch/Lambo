import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { RANGE_OPTIONS, isoDay, type RangeKey } from '@/data/analytics'
import { SITES } from '@/data/catalog'
import { HISTORY_START, TODAY } from '@/data/fleet'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { SearchInput } from '@/components/ui/SearchInput'
import { cn } from '@/lib/cn'
import type { PeriodFilters } from './usePeriodFilters'

const SITE_OPTIONS = [
  { value: 'all', label: 'All properties', hint: `${SITES.length}` },
  ...SITES.map((s) => ({ value: s.id, label: s.name, hint: s.city })),
]

const RANGES: { value: RangeKey; label: string }[] = [...RANGE_OPTIONS, { value: 'custom', label: 'Custom' }]

/** One filter row that scopes everything beneath it. */
export function FilterBar({ filters, search, searchPlaceholder, children, className }: {
  filters: PeriodFilters
  search?: boolean
  searchPlaceholder?: string
  children?: ReactNode
  className?: string
}) {
  const { range, setRange, from, setFrom, to, setTo, site, setSite, query, setQuery } = filters
  const min = isoDay(HISTORY_START)
  const max = isoDay(TODAY)

  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Segmented value={range} onChange={setRange} options={RANGES} />
      <AnimatePresence initial={false}>
        {range === 'custom' && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface-2/60 px-3.5 text-[13px]">
              <CalendarDays className="size-4 text-muted" />
              <input type="date" value={from} min={min} max={to} onChange={(e) => setFrom(e.target.value)} className="bg-transparent outline-none" aria-label="From date" />
            </label>
            <span className="text-muted">–</span>
            <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface-2/60 px-3.5 text-[13px]">
              <input type="date" value={to} min={from} max={max} onChange={(e) => setTo(e.target.value)} className="bg-transparent outline-none" aria-label="To date" />
            </label>
          </motion.div>
        )}
      </AnimatePresence>
      <Select value={site} onChange={setSite} options={SITE_OPTIONS} icon={<MapPin className="size-4" />} className="w-[220px]" />
      {search && <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} className="w-full sm:w-[260px]" />}
      {children}
    </div>
  )
}
