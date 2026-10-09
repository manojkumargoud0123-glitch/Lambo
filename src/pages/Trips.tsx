import { createColumnHelper } from '@tanstack/react-table'
import { motion } from 'motion/react'
import { ArrowRight, Flag } from 'lucide-react'
import type { FeatureCollection } from 'geojson'
import { useMemo, useState } from 'react'
import { BarList } from '@/components/charts/BarList'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { Feed, FeedRow } from '@/components/feed/Feed'
import { BatteryGlyph, Metric, RouteLine, TimeBlock, VehicleChip } from '@/components/feed/parts'
import { ViewToggle, type FeedView } from '@/components/feed/ViewToggle'
import { FilterBar } from '@/components/filters/FilterBar'
import { usePeriodFilters } from '@/components/filters/usePeriodFilters'
import { Page } from '@/components/layout/Page'
import { Em, PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/layout/Section'
import { GeoLayer } from '@/components/map/GeoLayer'
import { HtmlMarker } from '@/components/map/HtmlMarker'
import { MapView } from '@/components/map/MapView'
import { DataTable, type Columns } from '@/components/table/DataTable'
import { ExportMenu } from '@/components/table/ExportMenu'
import { SiteCell, VehicleCell } from '@/components/table/cells'
import { Card } from '@/components/ui/Card'
import { Drawer } from '@/components/ui/Drawer'
import { SocBar } from '@/components/ui/Gauge'
import { fadeUp } from '@/components/ui/motion'
import { Spec, SpecStrip } from '@/components/ui/Spec'
import { delta, filterBy, previousPeriod, summarizeTrips } from '@/data/analytics'
import { SITE_BY_ID } from '@/data/catalog'
import { TRIPS, VEHICLE_BY_ID } from '@/data/fleet'
import type { Trip } from '@/data/types'
import type { ExportColumn } from '@/lib/export'
import { dateLabel, fmt, minutesLabel, timeLabel } from '@/lib/format'
import { boundsOf, pathBetween } from '@/lib/geo'
import { createRng, hash } from '@/lib/random'

const fInt = (n: number) => fmt.int(n)
const fTwo = (n: number) => n.toFixed(2)
const tripDate = (t: Trip) => t.start
const tripKey = (t: Trip) => t.id
const daySummary = (rows: Trip[]) => `${fmt.int(rows.reduce((s, t) => s + t.distanceKm, 0))} km`

const col = createColumnHelper<Trip>()
const columns: Columns<Trip> = [
  col.accessor('code', { header: 'Vehicle', cell: (c) => <VehicleCell vehicleId={c.row.original.vehicleId} code={c.getValue()} />, enableHiding: false }),
  col.accessor('driver', { header: 'Driver' }),
  col.accessor((t) => SITE_BY_ID[t.siteId].name, { id: 'property', header: 'Property', cell: (c) => <SiteCell siteId={c.row.original.siteId} /> }),
  col.accessor('start', { id: 'date', header: 'Date', cell: (c) => dateLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor((t) => `${t.from} → ${t.to}`, {
    id: 'route',
    header: 'Route',
    cell: (c) => (
      <span className="flex items-center gap-2 text-ink-2">
        {c.row.original.from}
        <ArrowRight className="size-3 text-gold" />
        {c.row.original.to}
      </span>
    ),
  }),
  col.accessor('start', { id: 'startTime', header: 'Start', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('end', { header: 'End', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('durationMin', { header: 'Duration', cell: (c) => minutesLabel(c.getValue()), meta: { align: 'right' } }),
  col.accessor('distanceKm', { header: 'Distance', cell: (c) => <span className="text-ink">{c.getValue().toFixed(2)} km</span>, meta: { align: 'right' } }),
  col.accessor('energyKwh', { header: 'Energy', cell: (c) => `${c.getValue().toFixed(2)} kWh`, meta: { align: 'right' } }),
  col.accessor('efficiency', { header: 'km/kWh', cell: (c) => c.getValue().toFixed(1), meta: { align: 'right' } }),
  col.accessor((t) => t.startSoc - t.endSoc, { id: 'soc', header: 'SoC', cell: (c) => <SocBar start={c.row.original.startSoc} end={c.row.original.endSoc} className="w-28" /> }),
  col.accessor('avgSpeed', { header: 'Avg speed', cell: (c) => `${c.getValue().toFixed(1)} km/h`, meta: { align: 'right' } }),
]

const exportColumns: ExportColumn<Trip>[] = [
  { header: 'Trip ID', value: (t) => t.id },
  { header: 'Vehicle', value: (t) => t.code },
  { header: 'Model', value: (t) => VEHICLE_BY_ID[t.vehicleId].model.name },
  { header: 'Driver', value: (t) => t.driver },
  { header: 'Property', value: (t) => SITE_BY_ID[t.siteId].name },
  { header: 'Date', value: (t) => dateLabel(t.start) },
  { header: 'From', value: (t) => t.from },
  { header: 'To', value: (t) => t.to },
  { header: 'Start', value: (t) => timeLabel(t.start) },
  { header: 'End', value: (t) => timeLabel(t.end) },
  { header: 'Duration (min)', value: (t) => t.durationMin },
  { header: 'Idle (min)', value: (t) => t.idleMin },
  { header: 'Distance (km)', value: (t) => t.distanceKm },
  { header: 'Energy (kWh)', value: (t) => t.energyKwh },
  { header: 'Efficiency (km/kWh)', value: (t) => t.efficiency },
  { header: 'Start SoC (%)', value: (t) => t.startSoc },
  { header: 'End SoC (%)', value: (t) => t.endSoc },
  { header: 'Avg speed (km/h)', value: (t) => t.avgSpeed },
  { header: 'Max speed (km/h)', value: (t) => t.maxSpeed },
]

export default function Trips() {
  const filters = usePeriodFilters('7d')
  const { period, site, query } = filters
  const [selected, setSelected] = useState<Trip | null>(null)
  const [view, setView] = useState<FeedView>('feed')

  const data = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (t: Trip) => !q || `${t.code} ${t.driver} ${t.from} ${t.to} ${SITE_BY_ID[t.siteId].name}`.toLowerCase().includes(q)
    const rows = filterBy(TRIPS, period, site).filter(match)
    const prev = summarizeTrips(filterBy(TRIPS, previousPeriod(period), site).filter(match))
    const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}h`, trips: 0 }))
    const routes = new Map<string, number>()
    for (const t of rows) {
      hours[t.start.getHours()].trips++
      const k = `${t.from} → ${t.to}`
      routes.set(k, (routes.get(k) ?? 0) + 1)
    }
    return {
      rows,
      sum: summarizeTrips(rows),
      prev,
      hours: hours.slice(5, 24),
      routes: [...routes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    }
  }, [period, site, query])

  const { rows, sum, prev } = data

  const hero = (
    <PageHero
      index="03"
      eyebrow="Fleet operations"
      title="Trips"
      image="/media/resort.webp"
      imagePosition="60% 70%"
      narrative={
        <>
          <Em>{fmt.int(sum.trips)}</Em> journeys in <Em>{period.label.toLowerCase()}</Em> — from clubhouse to fairway, lobby to villa. Each one averaged{' '}
          <Em>{minutesLabel(sum.avgTripMin)}</Em> and <Em>{sum.trips ? (sum.distance / sum.trips).toFixed(1) : '0'} km</Em>.
        </>
      }
      filters={<FilterBar filters={filters} search searchPlaceholder="Vehicle, driver or place…" />}
    >
      <SpecStrip>
        <Spec label="Trips" value={sum.trips} format={fInt} delta={delta(sum.trips, prev.trips)} />
        <Spec label="Distance" value={sum.distance} unit="km" format={fInt} delta={delta(sum.distance, prev.distance)} />
        <Spec label="Energy" value={sum.energy} unit="kWh" format={fInt} delta={delta(sum.energy, prev.energy)} upIsGood={false} />
        <Spec label="Efficiency" value={sum.efficiency} unit="km/kWh" format={fTwo} delta={delta(sum.efficiency, prev.efficiency)} />
      </SpecStrip>
    </PageHero>
  )

  return (
    <Page hero={hero}>
      <Section index="01" title="Patterns" description="Where carts go most, and when they set off.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Most travelled routes</p>
            <div className="mt-6">
              <BarList items={data.routes.map(([k, n]) => ({ key: k, label: k, value: n }))} format={fInt} unit="trips" />
            </div>
          </Card>
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Trips by hour of departure</p>
            <div className="-mx-2 mt-5">
              <ColumnChart data={data.hours} dataKey="trips" unit="trips" height={250} />
            </div>
          </Card>
        </div>
      </Section>

      <Section
        index="02"
        title="Journeys"
        description={`${fmt.int(rows.length)} trips · ${period.label}`}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <ExportMenu name="trips" title="Trip report" subtitle={period.label} columns={exportColumns} rows={rows} />
          </>
        }
      >
        {view === 'feed' ? (
          <motion.div variants={fadeUp}>
            <Feed
              items={rows}
              date={tripDate}
              rowKey={tripKey}
              noun="trips"
              daySummary={daySummary}
              renderRow={(t) => (
                <FeedRow onClick={() => setSelected(t)} className="grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_minmax(0,230px)_minmax(0,1fr)_auto]">
                  <TimeBlock start={t.start} end={t.end} minutes={t.durationMin} />
                  <VehicleChip vehicleId={t.vehicleId} code={t.code} sub={t.driver} />
                  <RouteLine from={t.from} to={t.to} className="col-span-2 lg:col-span-1" />
                  <div className="col-span-2 flex items-center justify-end gap-6 lg:col-span-1">
                    <Metric value={t.distanceKm.toFixed(2)} unit="km" label="Distance" />
                    <Metric value={t.energyKwh.toFixed(2)} unit="kWh" label="Energy" />
                    <BatteryGlyph start={t.startSoc} end={t.endSoc} className="w-32" />
                  </div>
                </FeedRow>
              )}
            />
          </motion.div>
        ) : (
          <DataTable data={rows} columns={columns} getRowId={tripKey} initialSort={[{ id: 'date', desc: true }]} onRowClick={setSelected} />
        )}
      </Section>

      <Drawer open={!!selected} onClose={() => setSelected(null)} eyebrow={selected ? `${dateLabel(selected.start)} · ${SITE_BY_ID[selected.siteId].name}` : ''} title={selected?.code}>
        {selected && <TripDetail trip={selected} />}
      </Drawer>
    </Page>
  )
}

function TripDetail({ trip }: { trip: Trip }) {
  const path = useMemo(() => pathBetween(trip.fromAt, trip.toAt, createRng(hash(trip.id))), [trip])
  const line: FeatureCollection = useMemo(
    () => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path } }] }),
    [path],
  )
  const v = VEHICLE_BY_ID[trip.vehicleId]
  const stats = [
    ['Distance', `${trip.distanceKm.toFixed(2)} km`],
    ['Duration', minutesLabel(trip.durationMin)],
    ['Idle', minutesLabel(trip.idleMin)],
    ['Energy', `${trip.energyKwh.toFixed(2)} kWh`],
    ['Efficiency', `${trip.efficiency.toFixed(1)} km/kWh`],
    ['Avg / max speed', `${trip.avgSpeed.toFixed(1)} / ${trip.maxSpeed} km/h`],
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="relative h-[260px] overflow-hidden rounded-3xl border border-line">
        <MapView className="absolute inset-0" bounds={boundsOf(path)} padding={56}>
          <GeoLayer data={line} style={routeGlow} />
          <GeoLayer data={line} style={routeLine} />
          <HtmlMarker at={trip.fromAt}>
            <span className="block size-6 rounded-full border-2 border-white bg-moving shadow-lg" title={trip.from} />
          </HtmlMarker>
          <HtmlMarker at={trip.toAt}>
            <span className="grid size-7 place-items-center rounded-full border-2 border-white bg-gold shadow-lg" title={trip.to}>
              <Flag className="size-3.5 text-[#0b0b0a]" />
            </span>
          </HtmlMarker>
        </MapView>
      </div>

      <RouteLine from={trip.from} to={trip.to} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {stats.map(([k, val]) => (
          <div key={k} className="bg-surface px-4 py-3.5">
            <p className="eyebrow text-[8px]">{k}</p>
            <p className="mt-1.5 tabular-nums text-ink">{val}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="eyebrow mb-2">
          Battery · {timeLabel(trip.start)} → {timeLabel(trip.end)}
        </p>
        <BatteryGlyph start={trip.startSoc} end={trip.endSoc} />
      </div>

      <dl className="divide-y divide-line text-[13px]">
        {[
          ['Driver', trip.driver],
          ['Model', v.model.name],
          ['Trip ID', trip.id],
        ].map(([k, val]) => (
          <div key={k} className="flex justify-between py-2.5">
            <dt className="text-muted">{k}</dt>
            <dd className="text-ink-2">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const routeGlow = () => ({ color: '#d2b47a', weight: 12, opacity: 0.25, lineCap: 'round' as const, lineJoin: 'round' as const })
const routeLine = () => ({ color: '#d2b47a', weight: 3.5, opacity: 1, lineCap: 'round' as const, lineJoin: 'round' as const })
