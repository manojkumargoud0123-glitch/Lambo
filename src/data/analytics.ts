import { addDays, differenceInCalendarDays, endOfDay, format, startOfDay } from 'date-fns'
import { SITES } from './catalog'
import { HISTORY_START, NOW, TODAY } from './fleet'
import type { ChargeSession, Trip, Vehicle, VehicleStatus } from './types'

// ── Date ranges ─────────────────────────────────────────────
export type RangeKey = 'today' | '7d' | '30d' | 'custom'

export const RANGE_OPTIONS: { value: Exclude<RangeKey, 'custom'>; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
]

export interface Period {
  from: Date
  to: Date
  label: string
}

export const isoDay = (d: Date) => format(d, 'yyyy-MM-dd')

export function resolvePeriod(range: RangeKey, fromIso?: string, toIso?: string): Period {
  if (range === 'today') return { from: TODAY, to: NOW, label: 'Today' }
  if (range === '30d') return { from: addDays(TODAY, -29), to: NOW, label: 'Last 30 days' }
  if (range === 'custom' && fromIso && toIso) {
    const from = startOfDay(new Date(fromIso))
    const to = endOfDay(new Date(toIso))
    return { from: from < HISTORY_START ? HISTORY_START : from, to: to > NOW ? NOW : to, label: `${format(from, 'dd MMM')} – ${format(to, 'dd MMM')}` }
  }
  return { from: addDays(TODAY, -6), to: NOW, label: 'Last 7 days' }
}

/** The equally long window right before `p` — used for "vs previous" deltas. */
export function previousPeriod(p: Period): Period {
  const days = differenceInCalendarDays(p.to, p.from) + 1
  return { from: addDays(p.from, -days), to: addDays(p.to, -days), label: 'previous period' }
}

export const within = (d: Date, p: Period) => d >= p.from && d <= p.to

export function filterBy<T extends { start: Date; siteId: string }>(rows: T[], p: Period, siteId: string) {
  return rows.filter((r) => within(r.start, p) && (siteId === 'all' || r.siteId === siteId))
}

// ── Trip summary ────────────────────────────────────────────
export function summarizeTrips(trips: Trip[]) {
  let distance = 0
  let energy = 0
  let duration = 0
  let idle = 0
  for (const t of trips) {
    distance += t.distanceKm
    energy += t.energyKwh
    duration += t.durationMin
    idle += t.idleMin
  }
  const movingH = (duration - idle) / 60
  return {
    trips: trips.length,
    distance,
    energy,
    efficiency: energy ? distance / energy : 0,
    durationMin: duration,
    idleMin: idle,
    avgSpeed: movingH ? distance / movingH : 0,
    avgTripMin: trips.length ? duration / trips.length : 0,
  }
}

export type TripSummary = ReturnType<typeof summarizeTrips>

export const delta = (now: number, before: number) => (before ? ((now - before) / before) * 100 : 0)

// ── Series ──────────────────────────────────────────────────
export interface SeriesPoint {
  key: string
  label: string
  trips: number
  distance: number
  energy: number
  efficiency: number
  duration: number
  idle: number
  speed: number
}

export interface DayPoint extends SeriesPoint {
  date: Date
}

const blank = (key: string, label: string) => ({ key, label, trips: 0, distance: 0, energy: 0, efficiency: 0, duration: 0, idle: 0, speed: 0 })

function accumulate(pt: SeriesPoint, t: Trip) {
  pt.trips++
  pt.distance += t.distanceKm
  pt.energy += t.energyKwh
  pt.duration += t.durationMin
  pt.idle += t.idleMin
}

function finish(pt: SeriesPoint) {
  pt.efficiency = pt.energy ? pt.distance / pt.energy : 0
  const movingH = (pt.duration - pt.idle) / 60
  pt.speed = movingH > 0 ? pt.distance / movingH : 0
}

export function dailySeries(trips: Trip[], p: Period): DayPoint[] {
  const days = Math.max(1, differenceInCalendarDays(p.to, p.from) + 1)
  const map = new Map<string, DayPoint>()
  for (let i = 0; i < days; i++) {
    const date = addDays(startOfDay(p.from), i)
    const key = isoDay(date)
    map.set(key, { date, ...blank(key, format(date, 'dd MMM')) })
  }
  for (const t of trips) {
    const pt = map.get(isoDay(t.start))
    if (pt) accumulate(pt, t)
  }
  const out = [...map.values()]
  out.forEach(finish)
  return out
}

/** Hourly series for a single day ("Today" view of the trend chart). */
export function hourlySeries(trips: Trip[]): SeriesPoint[] {
  const out = Array.from({ length: 24 }, (_, h) => blank(String(h), `${String(h).padStart(2, '0')}:00`))
  for (const t of trips) accumulate(out[t.start.getHours()], t)
  out.forEach(finish)
  return out
}

/** Weekday (Mon–Sun) × hour trip counts. */
export function utilizationHeatmap(trips: Trip[]) {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0))
  for (const t of trips) {
    const wd = (t.start.getDay() + 6) % 7
    grid[wd][t.start.getHours()]++
  }
  let max = 0
  for (const row of grid) for (const v of row) if (v > max) max = v
  return { grid, max }
}

export const EFFICIENCY_BINS = [
  { label: 'Under 9', min: 0, max: 9 },
  { label: '9 – 11', min: 9, max: 11 },
  { label: '11 – 13', min: 11, max: 13 },
  { label: 'Over 13', min: 13, max: Infinity },
]

export function efficiencyDistribution(trips: Trip[]) {
  const counts = EFFICIENCY_BINS.map((b) => ({ ...b, trips: 0, share: 0 }))
  for (const t of trips) {
    const bin = counts.find((b) => t.efficiency >= b.min && t.efficiency < b.max)
    if (bin) bin.trips++
  }
  for (const c of counts) c.share = trips.length ? (c.trips / trips.length) * 100 : 0
  return counts
}

export function bySite(trips: Trip[]) {
  return SITES.map((s) => {
    const own = trips.filter((t) => t.siteId === s.id)
    const sum = summarizeTrips(own)
    return { site: s, ...sum }
  }).sort((a, b) => b.distance - a.distance)
}

export function topVehicles(trips: Trip[], vehicles: Vehicle[], n = 8) {
  const agg = new Map<string, { distance: number; trips: number; energy: number }>()
  for (const t of trips) {
    const a = agg.get(t.vehicleId) ?? { distance: 0, trips: 0, energy: 0 }
    a.distance += t.distanceKm
    a.trips++
    a.energy += t.energyKwh
    agg.set(t.vehicleId, a)
  }
  const byId = new Map(vehicles.map((v) => [v.id, v]))
  return [...agg.entries()]
    .map(([id, a]) => ({ vehicle: byId.get(id)!, ...a, efficiency: a.energy ? a.distance / a.energy : 0 }))
    .filter((r) => r.vehicle)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, n)
}

export function chargeSummary(sessions: ChargeSession[]) {
  let energy = 0
  let cost = 0
  let duration = 0
  let gain = 0
  for (const s of sessions) {
    energy += s.energyKwh
    cost += s.cost
    duration += s.durationMin
    gain += s.endSoc - s.startSoc
  }
  const n = sessions.length || 1
  return { sessions: sessions.length, energy, cost, avgDuration: duration / n, avgGain: gain / n, fast: sessions.filter((s) => s.type === 'Fast').length }
}

export function statusCounts(vehicles: Vehicle[]) {
  const counts: Record<VehicleStatus, number> = { moving: 0, idle: 0, charging: 0, parked: 0, offline: 0 }
  for (const v of vehicles) counts[v.status]++
  return counts
}
