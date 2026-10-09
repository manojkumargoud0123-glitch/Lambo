import { motion } from 'motion/react'
import { ArrowUpRight, BatteryCharging, CalendarDays, Route } from 'lucide-react'
import { addDays, endOfDay, format, startOfDay } from 'date-fns'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { BarList } from '@/components/charts/BarList'
import { Heatmap } from '@/components/charts/Heatmap'
import { ORDINAL_GOLD } from '@/components/charts/palette'
import { SocCurve } from '@/components/charts/SocCurve'
import { TrendChart } from '@/components/charts/TrendChart'
import { FilterBar } from '@/components/filters/FilterBar'
import { usePeriodFilters } from '@/components/filters/usePeriodFilters'
import { LiveStatus } from '@/components/fleet/LiveStatus'
import { Page } from '@/components/layout/Page'
import { Em, PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/layout/Section'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Card } from '@/components/ui/Card'
import { Gauge } from '@/components/ui/Gauge'
import { EASE, fadeUp } from '@/components/ui/motion'
import { Segmented } from '@/components/ui/Segmented'
import { Select } from '@/components/ui/Select'
import { Spec, SpecStrip } from '@/components/ui/Spec'
import { StatusBadge } from '@/components/ui/status'
import {
  bySite,
  chargeSummary,
  dailySeries,
  delta,
  efficiencyDistribution,
  filterBy,
  hourlySeries,
  isoDay,
  previousPeriod,
  summarizeTrips,
  topVehicles,
  utilizationHeatmap,
  type TripSummary,
} from '@/data/analytics'
import { DETAIL_SHOTS, MODEL_IMAGE, SITE_BY_ID, SITE_IMAGE } from '@/data/catalog'
import { CHARGES, HISTORY_START, PARKING, TODAY, TRIPS, VEHICLES, VEHICLE_BY_ID } from '@/data/fleet'
import { cn } from '@/lib/cn'
import { dateLabel, fmt, minutesLabel, timeLabel } from '@/lib/format'
import { useLiveFleet } from '@/state/liveFleet'
import { useQueryState } from '@/state/useQueryState'

// Stable formatters (memoised charts compare props by reference).
const fInt = (n: number) => fmt.int(n)
const fOne = (n: number) => fmt.one(n)
const fTwo = (n: number) => n.toFixed(2)
const fHours = (n: number) => `${fmt.int(n / 60)} h`
const fPct = (n: number) => `${n.toFixed(0)}%`

type MetricKey = 'distance' | 'trips' | 'energy' | 'efficiency' | 'duration' | 'idle' | 'speed'
const RAIL: { key: MetricKey; label: string; unit: string; sum: keyof TripSummary; value: (n: number) => string; chart: (n: number) => string; upIsGood: boolean }[] = [
  { key: 'distance', label: 'Distance', unit: 'km', sum: 'distance', value: fInt, chart: fOne, upIsGood: true },
  { key: 'trips', label: 'Trips', unit: '', sum: 'trips', value: fInt, chart: fInt, upIsGood: true },
  { key: 'energy', label: 'Energy used', unit: 'kWh', sum: 'energy', value: fInt, chart: fOne, upIsGood: false },
  { key: 'efficiency', label: 'Efficiency', unit: 'km/kWh', sum: 'efficiency', value: fTwo, chart: fTwo, upIsGood: true },
  { key: 'duration', label: 'Drive time', unit: '', sum: 'durationMin', value: minutesLabel, chart: fHours, upIsGood: true },
  { key: 'idle', label: 'Idle time', unit: '', sum: 'idleMin', value: minutesLabel, chart: fHours, upIsGood: false },
  { key: 'speed', label: 'Average speed', unit: 'km/h', sum: 'avgSpeed', value: fOne, chart: fOne, upIsGood: true },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const VEHICLE_OPTIONS = [...VEHICLES].sort((a, b) => a.code.localeCompare(b.code)).map((v) => ({ value: v.id, label: v.code, hint: SITE_BY_ID[v.siteId].name }))
const DEFAULT_VEHICLE = VEHICLES.find((v) => v.status === 'moving')?.id ?? VEHICLES[0].id

export default function Analytics() {
  const [view, setView] = useQueryState<'fleet' | 'vehicle'>('view', 'fleet')
  const toggle = (
    <Segmented
      value={view}
      onChange={setView}
      options={[
        { value: 'fleet', label: 'Fleet' },
        { value: 'vehicle', label: 'Vehicle' },
      ]}
    />
  )
  return view === 'fleet' ? <FleetAnalytics toggle={toggle} /> : <VehicleSnapshot toggle={toggle} />
}

// ─────────────────────────────────────────────────────────────
function FleetAnalytics({ toggle }: { toggle: ReactNode }) {
  const filters = usePeriodFilters('7d')
  const { period, site, range } = filters
  const [metric, setMetric] = useState<MetricKey>('distance')

  const data = useMemo(() => {
    const trips = filterBy(TRIPS, period, site)
    const sum = summarizeTrips(trips)
    const prev = summarizeTrips(filterBy(TRIPS, previousPeriod(period), site))
    const single = range === 'today' || isoDay(period.from) === isoDay(period.to)
    const series = single ? hourlySeries(trips) : dailySeries(trips, period)
    const heat = utilizationHeatmap(filterBy(TRIPS, { from: addDays(TODAY, -27), to: new Date(), label: '' }, site))
    const charge = chargeSummary(filterBy(CHARGES, period, site))
    const prevCharge = chargeSummary(filterBy(CHARGES, previousPeriod(period), site))
    return {
      sum,
      prev,
      series,
      single,
      heat,
      charge,
      prevCharge,
      vehicles: new Set(trips.map((t) => t.vehicleId)).size,
      sites: new Set(trips.map((t) => t.siteId)).size,
      efficiency: efficiencyDistribution(trips),
      bySite: bySite(trips),
      top: topVehicles(trips, VEHICLES, 8),
    }
  }, [period, site, range])

  const { sum, prev, series } = data
  const spark = (k: MetricKey) => series.slice(-14).map((d) => d[k])
  const active = RAIL.find((r) => r.key === metric)!
  const peak = useMemo(() => heatInsights(data.heat.grid), [data.heat])

  const hero = (
    <PageHero
      index="02"
      eyebrow="Trip intelligence"
      title="Fleet Analytics"
      image="/media/golf.webp"
      actions={toggle}
      narrative={
        <>
          Across <Em>{period.label.toLowerCase()}</Em>, <Em>{data.vehicles}</Em> carts completed <Em>{fmt.int(sum.trips)}</Em> trips over{' '}
          <Em>{fmt.int(sum.distance)} km</Em> at <Em>{sum.efficiency.toFixed(1)} km per kWh</Em>, across {data.sites} properties.
        </>
      }
      filters={<FilterBar filters={filters} />}
    >
      <SpecStrip>
        <Spec label="Distance" value={sum.distance} unit="km" format={fInt} delta={delta(sum.distance, prev.distance)} trend={spark('distance')} />
        <Spec label="Trips" value={sum.trips} format={fInt} delta={delta(sum.trips, prev.trips)} trend={spark('trips')} />
        <Spec label="Efficiency" value={sum.efficiency} unit="km/kWh" format={fTwo} delta={delta(sum.efficiency, prev.efficiency)} trend={spark('efficiency')} />
        <Spec label="Energy cost" value={data.charge.cost} format={fmt.inr} delta={delta(data.charge.cost, data.prevCharge.cost)} upIsGood={false} />
      </SpecStrip>
    </PageHero>
  )

  return (
    <Page hero={hero}>
      <Section index="01" title="Performance" description={data.single ? 'Hour by hour, today.' : `Day by day, ${period.label.toLowerCase()}.`}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <ul className="card divide-y divide-line overflow-hidden p-2">
            {RAIL.map((r) => {
              const now = sum[r.sum]
              const d = delta(now, prev[r.sum])
              const good = d === 0 ? null : d > 0 === r.upIsGood
              const on = r.key === metric
              return (
                <li key={r.key} className="border-0">
                  <button
                    type="button"
                    onClick={() => setMetric(r.key)}
                    aria-pressed={on}
                    className={cn('relative flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors duration-300', on ? 'bg-surface-3/70' : 'hover:bg-surface-2/70')}
                  >
                    {on && <motion.span layoutId="rail-mark" className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-gold" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                    <span>
                      <span className={cn('eyebrow block', on && 'text-ink-2')}>{r.label}</span>
                      <span className="mt-1.5 block text-[22px] font-light leading-none text-ink">
                        {r.value(now)}
                        {r.unit && <span className="ml-1 text-[12px] text-muted">{r.unit}</span>}
                      </span>
                    </span>
                    <span className={cn('text-[12px] tabular-nums', good === null ? 'text-muted' : good ? 'text-good' : 'text-bad')}>{fmt.signedPct(d)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">{active.label}</p>
                <p className="mt-3 flex items-baseline gap-2">
                  <AnimatedNumber value={sum[active.sum]} format={active.value} className="metal-text text-[clamp(2.6rem,4.4vw,4rem)] font-extralight leading-none" />
                  {active.unit && <span className="text-sm text-muted">{active.unit}</span>}
                </p>
              </div>
              <p className="text-[12px] text-muted">{period.label}</p>
            </div>
            <div className="-mx-2 mt-8">
              <TrendChart data={series} dataKey={metric} unit={active.unit} format={active.chart} height={320} />
            </div>
          </Card>
        </div>
      </Section>

      <Section index="02" title="Rhythm" description="When the fleet works — trip starts by weekday and hour over the last four weeks.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="p-6 sm:p-8">
            <Heatmap grid={data.heat.grid} max={data.heat.max} />
          </Card>
          <div className="grid content-start gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <Insight label="Peak hour" value={`${DAYS[peak.cell.d]} ${String(peak.cell.h).padStart(2, '0')}:00`} note={`${fmt.int(peak.cell.v)} trip starts`} />
            <Insight label="Busiest day" value={DAYS[peak.day.d]} note={`${fmt.int(peak.day.v)} trips in four weeks`} />
            <Insight label="Quietest hour" value={`${String(peak.quiet.h).padStart(2, '0')}:00`} note="Ideal window for charging & service" />
          </div>
        </div>
      </Section>

      <Section index="03" title="Balance" description="Efficiency across trips, output across properties, and the fleet at this moment.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Efficiency bands</p>
            <p className="mt-1 text-[13px] text-muted">Share of trips by km per kWh</p>
            <div className="mt-7">
              <BarList items={data.efficiency.map((b, i) => ({ key: b.label, label: `${b.label} km/kWh`, value: b.share, color: ORDINAL_GOLD[i] }))} format={fPct} />
            </div>
          </Card>
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Properties</p>
            <p className="mt-1 text-[13px] text-muted">Distance travelled per property</p>
            <div className="mt-7">
              <BarList items={data.bySite.map((s) => ({ key: s.site.id, label: s.site.name, sub: s.site.city, value: s.distance }))} format={fInt} unit="km" />
            </div>
          </Card>
          <Card className="p-6 sm:p-7">
            <LiveStatus siteId={site} />
          </Card>
        </div>
      </Section>

      <Section index="04" title="Leaders" description="The most travelled carts of the period.">
        <div className="grid gap-4 lg:grid-cols-3">
          {data.top.slice(0, 3).map((r, i) => (
            <Link key={r.vehicle.id} to={`/analytics?view=vehicle&vehicle=${r.vehicle.id}`} className="card rise group relative overflow-hidden p-6 sm:p-7" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="flex items-start justify-between">
                <span className="metal-text font-wide text-[60px] font-extralight leading-none">{String(i + 1).padStart(2, '0')}</span>
                <ArrowUpRight className="size-5 text-muted transition-transform duration-500 ease-lux group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-gold" />
              </div>
              <div className="relative mt-2 h-[150px]">
                <div className="absolute inset-x-10 bottom-1 h-6 rounded-[50%] bg-black/50 blur-xl" />
                <img src={MODEL_IMAGE[r.vehicle.model.id]} alt={r.vehicle.model.name} className="relative mx-auto h-full object-contain transition-transform duration-700 ease-lux group-hover:scale-[1.04]" />
              </div>
              <p className="mt-4 font-wide text-[14px] uppercase tracking-[0.06em] text-ink">{r.vehicle.code}</p>
              <p className="mt-1 text-[12px] text-muted">
                {r.vehicle.model.name} · {SITE_BY_ID[r.vehicle.siteId].name}
              </p>
              <div className="mt-5 grid grid-cols-3 border-t border-line pt-4 text-[13px]">
                <Mini label="Distance" value={`${fmt.int(r.distance)} km`} />
                <Mini label="Trips" value={fmt.int(r.trips)} />
                <Mini label="km/kWh" value={r.efficiency.toFixed(1)} />
              </div>
            </Link>
          ))}
        </div>
        <ul className="card mt-4 divide-y divide-line px-2">
          {data.top.slice(3).map((r, i) => (
            <li key={r.vehicle.id}>
              <Link to={`/analytics?view=vehicle&vehicle=${r.vehicle.id}`} className="group flex items-center gap-5 rounded-2xl px-4 py-3 transition-colors hover:bg-surface-2/60">
                <span className="w-6 font-wide text-[11px] text-gold">{String(i + 4).padStart(2, '0')}</span>
                <img src={MODEL_IMAGE[r.vehicle.model.id]} alt="" className="h-9 w-16 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-wide text-[10.5px] uppercase tracking-[0.08em] text-ink">{r.vehicle.code}</span>
                  <span className="block truncate text-[12px] text-muted">{SITE_BY_ID[r.vehicle.siteId].name}</span>
                </span>
                <span className="text-right text-[13px] tabular-nums text-ink">
                  {fmt.one(r.distance)} km
                  <span className="block text-[11px] text-muted">{r.trips} trips</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </Page>
  )
}

function heatInsights(grid: number[][]) {
  let cell = { d: 0, h: 0, v: -1 }
  let day = { d: 0, v: -1 }
  let quiet = { h: 6, v: Infinity }
  grid.forEach((row, d) => {
    const total = row.reduce((a, b) => a + b, 0)
    if (total > day.v) day = { d, v: total }
    row.forEach((v, h) => v > cell.v && (cell = { d, h, v }))
  })
  for (let h = 7; h <= 21; h++) {
    const v = grid.reduce((a, row) => a + row[h], 0)
    if (v < quiet.v) quiet = { h, v }
  }
  return { cell, day, quiet }
}

function Insight({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <motion.div variants={fadeUp} className="card p-6">
      <p className="eyebrow">{label}</p>
      <p className="mt-3 font-wide text-[17px] font-light uppercase tracking-[0.04em] text-ink">{value}</p>
      <p className="mt-1.5 text-[13px] text-muted">{note}</p>
    </motion.div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tabular-nums text-ink">{value}</p>
      <p className="eyebrow mt-1 text-[7.5px]">{label}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
function VehicleSnapshot({ toggle }: { toggle: ReactNode }) {
  const [vehicleId, setVehicleId] = useQueryState<string>('vehicle', DEFAULT_VEHICLE)
  const [day, setDay] = useQueryState('day', isoDay(TODAY))
  const vehicle = VEHICLE_BY_ID[vehicleId] ?? VEHICLES[0]
  const site = SITE_BY_ID[vehicle.siteId]

  const snap = useMemo(() => {
    const from = startOfDay(new Date(day))
    const to = endOfDay(from)
    const inDay = <T extends { start: Date; vehicleId: string }>(rows: T[]) =>
      rows.filter((r) => r.vehicleId === vehicle.id && r.start >= from && r.start <= to).sort((a, b) => a.start.getTime() - b.start.getTime())
    const trips = inDay(TRIPS)
    const charges = inDay(CHARGES)
    const parks = inDay(PARKING)
    const sum = summarizeTrips(trips)
    const events = [...trips, ...charges].sort((a, b) => a.start.getTime() - b.start.getTime())
    const startSoc = events[0]?.startSoc ?? Math.round(vehicle.soc)
    const endSoc = events.length ? events[events.length - 1].endSoc : startSoc
    const points = events.flatMap((e) => [
      { t: e.start.getTime(), soc: e.startSoc },
      { t: Math.min(e.end.getTime(), to.getTime()), soc: e.endSoc },
    ])
    const since = TRIPS.filter((t) => t.vehicleId === vehicle.id && t.start >= from).reduce((s, t) => s + t.distanceKm, 0)
    const startOdo = vehicle.odometer - since
    return {
      from,
      trips,
      charges,
      parks,
      sum,
      consumed: trips.reduce((s, t) => s + (t.startSoc - t.endSoc), 0),
      charged: charges.reduce((s, c) => s + (c.endSoc - c.startSoc), 0),
      startSoc,
      endSoc,
      points,
      startOdo,
      endOdo: startOdo + sum.distance,
      curveFrom: from.getTime() + 5 * 3600_000,
      curveTo: from.getTime() + 24 * 3600_000 - 1,
    }
  }, [vehicle, day])

  const hero = (
    <PageHero
      index="02"
      eyebrow="Vehicle snapshot"
      title={vehicle.code}
      image={SITE_IMAGE[site.kind]}
      actions={toggle}
      narrative={
        <>
          The <Em>{vehicle.model.name}</Em> at <Em>{site.name}</Em>, {site.city}. On <Em>{format(snap.from, 'EEEE d MMMM')}</Em> it made <Em>{snap.trips.length}</Em> trips
          covering <Em>{snap.sum.distance.toFixed(1)} km</Em> and charged <Em>{snap.charges.length}</Em> {snap.charges.length === 1 ? 'time' : 'times'}.
        </>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={vehicle.id} onChange={setVehicleId} options={VEHICLE_OPTIONS} searchable label="Vehicle" className="w-[300px]" width={320} />
          <label className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface-2/60 px-4 text-[13px]">
            <CalendarDays className="size-4 text-muted" />
            <input type="date" value={day} min={isoDay(HISTORY_START)} max={isoDay(TODAY)} onChange={(e) => e.target.value && setDay(e.target.value)} className="bg-transparent outline-none" aria-label="Day" />
          </label>
          <Segmented
            size="sm"
            value={day === isoDay(TODAY) ? 'today' : day === isoDay(addDays(TODAY, -1)) ? 'yesterday' : 'other'}
            onChange={(v) => v !== 'other' && setDay(isoDay(v === 'today' ? TODAY : addDays(TODAY, -1)))}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
            ]}
          />
        </div>
      }
    >
      <SpecStrip>
        <Spec label="Distance" value={snap.sum.distance} unit="km" format={fOne} note={`${snap.trips.length} trips`} />
        <Spec label="Energy" value={snap.sum.energy} unit="kWh" format={fTwo} note={`${snap.sum.efficiency.toFixed(1)} km/kWh`} />
        <Spec label="Drive time" value={snap.sum.durationMin} format={minutesLabel} note={`${minutesLabel(snap.sum.idleMin)} idle`} />
        <Spec label="End of day charge" value={snap.endSoc} unit="%" format={fInt} note={`Started at ${snap.startSoc}%`} />
      </SpecStrip>
    </PageHero>
  )

  return (
    <Page hero={hero}>
      <Section index="01" title="The day at a glance" description="Distance, energy and battery — measured against the cart's own capacity.">
        <Card className="overflow-visible" key={vehicle.id}>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-70" />
          <div className="grid items-center gap-8 px-6 py-10 lg:grid-cols-[1fr_minmax(0,1.3fr)_1fr] lg:px-10">
            <div className="grid grid-cols-2 gap-x-2 gap-y-6">
              <Gauge label="Distance" value={snap.sum.distance} max={Math.max(20, vehicle.model.rangeKm * 0.8)} unit="km" format={fOne} />
              <Gauge label="Energy" value={snap.sum.energy} max={vehicle.model.batteryKwh * 1.5} unit="kWh" format={fTwo} />
              <Gauge label="Efficiency" value={snap.sum.efficiency} max={16} unit="km/kWh" format={fOne} />
              <Gauge label="Drive time" value={snap.sum.durationMin} max={600} unit="min" format={fInt} />
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex flex-wrap justify-center gap-2">
                <Chip>
                  <Route className="size-3.5 text-gold" /> Trips <b className="font-normal text-ink">{snap.trips.length}</b>
                </Chip>
                <Chip>
                  <BatteryCharging className="size-3.5 text-gold" /> Charge cycles <b className="font-normal text-ink">{snap.charges.length}</b>
                </Chip>
              </div>
              <div className="relative mt-6 w-full max-w-[480px]">
                <div className="absolute inset-x-8 bottom-2 h-10 rounded-[50%] bg-black/50 blur-2xl" />
                <motion.img
                  src={MODEL_IMAGE[vehicle.model.id]}
                  alt={vehicle.model.name}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 1.1, ease: EASE }}
                  className="relative mx-auto max-h-[240px] w-full object-contain"
                />
              </div>
              <div className="mt-6 grid w-full max-w-[420px] grid-cols-2 divide-x divide-line rounded-2xl border border-line">
                <div className="px-4 py-3">
                  <p className="eyebrow text-[8px]">Start odometer</p>
                  <p className="mt-1 tabular-nums text-ink">{fmt.one(snap.startOdo)} km</p>
                </div>
                <div className="px-4 py-3">
                  <p className="eyebrow text-[8px]">End odometer</p>
                  <p className="mt-1 tabular-nums text-ink">{fmt.one(snap.endOdo)} km</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-6">
              <Gauge label="SoC consumed" value={snap.consumed} max={Math.max(100, snap.consumed)} unit="%" format={fInt} />
              <Gauge label="SoC charged" value={snap.charged} max={Math.max(100, snap.charged)} unit="%" format={fInt} color="var(--charging)" />
              <Gauge label="Start SoC" value={snap.startSoc} max={100} unit="%" format={fInt} />
              <Gauge label="End SoC" value={snap.endSoc} max={100} unit="%" format={fInt} color={snap.endSoc < 25 ? 'var(--bad)' : 'var(--gold)'} />
            </div>
          </div>
        </Card>
      </Section>

      <Section index="02" title="Battery through the day" description="Charge falls while driving and climbs on the charger.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="p-4 sm:p-6">
            {snap.points.length > 1 ? (
              <SocCurve points={snap.points} from={snap.curveFrom} to={snap.curveTo} height={300} />
            ) : (
              <p className="grid h-[300px] place-items-center text-sm text-muted">No activity recorded for this day.</p>
            )}
          </Card>
          <Card className="p-6">
            <p className="eyebrow">Timeline · {dateLabel(snap.from)}</p>
            <ol className="relative mt-5 max-h-[300px] space-y-4 overflow-y-auto border-l border-line pl-5 pr-1">
              {[...snap.trips.map((t) => ({ kind: 'trip' as const, at: t.start, t })), ...snap.charges.map((c) => ({ kind: 'charge' as const, at: c.start, c }))]
                .sort((a, b) => a.at.getTime() - b.at.getTime())
                .map((e) => (
                  <li key={e.kind === 'trip' ? e.t.id : e.c.id} className="relative">
                    <span className={cn('absolute -left-[25px] top-1.5 size-2.5 rounded-full ring-4 ring-[var(--surface)]', e.kind === 'trip' ? 'bg-gold' : 'bg-charging')} />
                    <p className="text-[11px] tabular-nums text-muted">{timeLabel(e.at)}</p>
                    {e.kind === 'trip' ? (
                      <p className="text-[13px] text-ink-2">
                        {e.t.from} <span className="text-muted">→</span> {e.t.to}
                        <span className="ml-2 text-[11px] text-muted">
                          {e.t.distanceKm.toFixed(1)} km · {e.t.startSoc}→{e.t.endSoc}%
                        </span>
                      </p>
                    ) : (
                      <p className="text-[13px] text-ink-2">
                        Charging · {e.c.charger}
                        <span className="ml-2 text-[11px] text-muted">
                          {e.c.startSoc}→{e.c.endSoc}% · {e.c.energyKwh.toFixed(1)} kWh
                        </span>
                      </p>
                    )}
                  </li>
                ))}
              {snap.trips.length + snap.charges.length === 0 && <li className="text-sm text-muted">Nothing recorded.</li>}
            </ol>
          </Card>
        </div>
      </Section>

      <Section index="03" title="The vehicle" description="Profile, live telemetry and craftsmanship.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-6">
            <p className="eyebrow">Profile</p>
            <dl className="mt-4 divide-y divide-line text-[13px]">
              {[
                ['Driver', vehicle.driver ?? 'Unassigned'],
                ['Property', `${site.name}, ${site.city}`],
                ['Model', vehicle.model.name],
                ['Seats', String(vehicle.model.seats)],
                ['Battery', `${vehicle.model.batteryKwh} kWh · ${vehicle.batteryHealth}% health`],
                ['Rated range', `${vehicle.model.rangeKm} km`],
                ['In service since', format(vehicle.commissioned, 'MMM yyyy')],
                ['Lifetime distance', `${fmt.int(vehicle.odometer)} km`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate text-right text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-6">
            <LiveMetrics vehicleId={vehicle.id} />
          </Card>
          <Card className="p-6">
            <p className="eyebrow">Craftsmanship</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {DETAIL_SHOTS.map((d) => (
                <figure key={d.src} className="group relative aspect-square overflow-hidden rounded-2xl">
                  <img src={d.src} alt={d.label} loading="lazy" className="size-full object-cover transition-transform duration-700 ease-lux group-hover:scale-110" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                    <span className="block font-wide text-[9px] uppercase tracking-[0.16em] text-white">{d.label}</span>
                    <span className="block text-[11px] text-white/70">{d.note}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Card>
        </div>
      </Section>
    </Page>
  )
}

/** Isolated live subscription: only this card re-renders each telemetry tick. */
function LiveMetrics({ vehicleId }: { vehicleId: string }) {
  const live = useLiveFleet()
  const v = live.find((x) => x.id === vehicleId)!
  const range = (v.soc / 100) * v.model.rangeKm * (v.batteryHealth / 100)
  const metrics = [
    { label: 'Battery', value: v.soc, unit: '%' },
    { label: 'Est. range', value: range, unit: 'km' },
    { label: 'Speed', value: v.speed, unit: 'km/h' },
    { label: 'Pack temp', value: v.batteryTemp, unit: '°C' },
  ]
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="eyebrow">Right now</p>
        <StatusBadge status={v.status} size="sm" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {metrics.map((x) => (
          <div key={x.label} className="bg-surface p-4">
            <p className="flex items-baseline gap-1">
              <AnimatedNumber value={x.value} format={fInt} duration={0.6} className="text-3xl font-extralight text-ink" />
              <span className="text-[11px] text-muted">{x.unit}</span>
            </p>
            <p className="eyebrow mt-1.5 text-[8px]">{x.label}</p>
          </div>
        ))}
      </div>
      <Link to={`/?v=${v.id}`} className="mt-5 block rounded-full border border-line py-2.5 text-center font-wide text-[9.5px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold-wash">
        Locate on map
      </Link>
    </>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/60 px-3.5 py-1.5 text-[12px] text-ink-2">{children}</span>
}
