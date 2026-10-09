import { addDays } from 'date-fns'
import { useMemo } from 'react'
import { isoDay, resolvePeriod, type RangeKey } from '@/data/analytics'
import { TODAY } from '@/data/fleet'
import { useQueryState } from '@/state/useQueryState'

/** Period, property and search filters, all mirrored into the URL. */
export function usePeriodFilters(defaultRange: RangeKey = '7d') {
  const [range, setRange] = useQueryState<RangeKey>('range', defaultRange)
  const [from, setFrom] = useQueryState('from', isoDay(addDays(TODAY, -6)))
  const [to, setTo] = useQueryState('to', isoDay(TODAY))
  const [site, setSite] = useQueryState<string>('site', 'all')
  const [query, setQuery] = useQueryState<string>('q', '')

  const period = useMemo(() => resolvePeriod(range, from, to), [range, from, to])

  return { range, setRange, from, setFrom, to, setTo, site, setSite, query, setQuery, period }
}

export type PeriodFilters = ReturnType<typeof usePeriodFilters>
