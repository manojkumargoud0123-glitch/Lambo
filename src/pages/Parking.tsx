import { createColumnHelper } from '@tanstack/react-table'
import { addDays } from 'date-fns'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { BarList } from '@/components/charts/BarList'
import { ColumnChart } from '@/components/charts/ColumnChart'
import { DayTimeline, type Lane } from '@/components/charts/DayTimeline'
import { ORDINAL_GOLD_5 } from '@/components/charts/palette'
import { Feed, FeedRow } from '@/components/feed/Feed'
import { Metric, TimeBlock, VehicleChip } from '@/components/feed/parts'
import { ViewToggle, type FeedView } from '@/components/feed/ViewToggle'
import { FilterBar } from '@/components/filters/FilterBar'
import { usePeriodFilters } from '@/components/filters/usePeriodFilters'
import { Page } from '@/components/layout/Page'
import { Em, PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/layout/Section'
import { DataTable, type Columns } from '@/components/table/DataTable'
import { ExportMenu } from '@/components/table/ExportMenu'
import { Pill, SiteCell, VehicleCell } from '@/components/table/cells'
import { Card } from '@/components/ui/Card'
import { BatteryMeter } from '@/components/ui/Gauge'
import { fadeUp } from '@/components/ui/motion'
import { Segmented } from '@/components/ui/Segmented'
import { Spec, SpecStrip } from '@/components/ui/Spec'
import { delta, filterBy, isoDay, previousPeriod } from '@/data/analytics'
import { SITE_BY_ID } from '@/data/catalog'
import { CHARGES, NOW, PARKING, TODAY, TRIPS } from '@/data/fleet'
import type { ParkingEvent } from '@/data/types'
import type { ExportColumn } from '@/lib/export'
import { clockDuration, dateLabel, fmt, minutesLabel, timeLabel } from '@/lib/format'

const fInt = (n: number) => fmt.int(n)
const fPctInt = (n: number) => n.toFixed(0)
const parkDate = (p: ParkingEvent) => p.start
const parkKey = (p: ParkingEvent) => p.id
const daySummary = (rows: ParkingEvent[]) => `${minutesLabel(rows.reduce((s, p) => s + p.durationMin, 0))} parked`

const DWELL_BINS = [
  { label: '< 15 min', max: 15 },
  { label: '15–30 min', max: 30 },
  { label: '30–60 min', max: 60 },
  { label: '1–2 h', max: 120 },
  { label: '> 2 h', max: Infinity },
]

const ZonePill = ({ inZone }: { inZone: boolean }) => (inZone ? <Pill color="var(--moving)">Designated zone</Pill> : <Pill color="var(--muted)">Open course</Pill>)

const col = createColumnHelper<ParkingEvent>()
const columns: Columns<ParkingEvent> = [
  col.accessor('code', { header: 'Vehicle', cell: (c) => <VehicleCell vehicleId={c.row.original.vehicleId} code={c.getValue()} />, enableHiding: false }),
  col.accessor((p) => SITE_BY_ID[p.siteId].name, { id: 'property', header: 'Property', cell: (c) => <SiteCell siteId={c.row.original.siteId} /> }),
  col.accessor('location', { header: 'Location', cell: (c) => <span className="text-ink-2">{c.getValue()}</span> }),
  col.accessor('inZone', { header: 'Zone', cell: (c) => <ZonePill inZone={c.row.original.inZone} /> }),
  col.accessor('start', { id: 'date', header: 'Date', cell: (c) => dateLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('start', { id: 'startTime', header: 'Start', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('end', { header: 'End', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('durationMin', { header: 'Duration', cell: (c) => <span className="text-ink">{clockDuration(c.getValue() * 60)}</span>, meta: { align: 'right' } }),
  col.accessor('soc', {
    header: 'SoC at park',
    cell: (c) => (
      <span className="flex items-center gap-2.5">
        <BatteryMeter soc={c.getValue()} className="w-16" />
        <span className="w-9 text-right">{c.getValue()}%</span>
      </span>
    ),
  }),
]

const exportColumns: ExportColumn<ParkingEvent>[] = [
  { header: 'Event ID', value: (p) => p.id },
  { header: 'Vehicle', value: (p) => p.code },
  { header: 'Property', value: (p) => SITE_BY_ID[p.siteId].name },
  { header: 'Location', value: (p) => p.location },
  { header: 'Zone', value: (p) => (p.inZone ? 'Designated' : 'Open course') },
  { header: 'Date', value: (p) => dateLabel(p.start) },
  { header: 'Start', value: (p) => timeLabel(p.start) },
  { header: 'End', value: (p) => timeLabel(p.end) },
  { header: 'Duration', value: (p) => clockDuration(p.durationMin * 60) },
  { header: 'SoC (%)', value: (p) => p.soc },
]

function summarize(rows: ParkingEvent[]) {
  const total = rows.reduce((s, r) => s + r.durationMin, 0)
  return { events: rows.length, total, avg: rows.length ? total / rows.length : 0, zoned: rows.length ? (rows.filter((r) => r.inZone).length / rows.length) * 100 : 0 }
}

export default function Parking() {
  const filters = usePeriodFilters('7d')
  const { period, site, query } = filters
  const [view, setView] = useState<FeedView>('feed')
  const [timelineDay, setTimelineDay] = useState<'today' | 'yesterday'>('today')

  const data = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (p: ParkingEvent) => !q || `${p.code} ${p.location} ${SITE_BY_ID[p.siteId].name}`.toLowerCase().includes(q)
    const rows = filterBy(PARKING, period, site).filter(match)
    const prevRows = filterBy(PARKING, previousPeriod(period), site).filter(match)
    const bins = DWELL_BINS.map((b) => ({ label: b.label, events: 0 }))
    for (const r of rows) bins[DWELL_BINS.findIndex((b) => r.durationMin < b.max)].events++
    const byLoc = new Map<string, number>()
    for (const r of rows) byLoc.set(r.location, (byLoc.get(r.location) ?? 0) + 1)
    return { rows, sum: summarize(rows), prev: summarize(prevRows), bins, locations: [...byLoc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6) }
  }, [period, site, query])

  const day = useMemo(() => (timelineDay === 'today' ? TODAY : addDays(TODAY, -1)), [timelineDay])
  const lanes = useMemo<Lane[]>(() => {
    const key = isoDay(day)
    const onDay = <T extends { start: Date; siteId: string }>(r: T) => isoDay(r.start) === key && (site === 'all' || r.siteId === site)
    const parks = PARKING.filter(onDay)
    const busiest = new Map<string, number>()
    for (const p of parks) busiest.set(p.vehicleId, (busiest.get(p.vehicleId) ?? 0) + p.durationMin)
    return [...busiest.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([vehicleId]) => ({
        vehicleId,
        code: parks.find((p) => p.vehicleId === vehicleId)!.code,
        parks: parks.filter((p) => p.vehicleId === vehicleId),
        trips: TRIPS.filter((t) => t.vehicleId === vehicleId && onDay(t)),
        charges: CHARGES.filter((c) => c.vehicleId === vehicleId && onDay(c)),
      }))
  }, [day, site])

  const { rows, sum, prev } = data

  const hero = (
    <PageHero
      index="05"
      eyebrow="Fleet operations"
      title="Parking"
      image="/media/hangar.webp"
      imagePosition="70% 60%"
      narrative={
        <>
          Between journeys, carts rested <Em>{fmt.int(sum.events)}</Em> times in <Em>{period.label.toLowerCase()}</Em> — <Em>{minutesLabel(sum.total)}</Em> in all, with{' '}
          <Em>{sum.zoned.toFixed(0)}%</Em> of stops inside designated zones.
        </>
      }
      filters={<FilterBar filters={filters} search searchPlaceholder="Vehicle or location…" />}
    >
      <SpecStrip>
        <Spec label="Parking events" value={sum.events} format={fInt} delta={delta(sum.events, prev.events)} />
        <Spec label="Time parked" value={sum.total} format={minutesLabel} delta={delta(sum.total, prev.total)} upIsGood={false} />
        <Spec label="Average dwell" value={sum.avg} format={minutesLabel} delta={delta(sum.avg, prev.avg)} upIsGood={false} />
        <Spec label="In designated zones" value={sum.zoned} unit="%" format={fPctInt} delta={delta(sum.zoned, prev.zoned)} />
      </SpecStrip>
    </PageHero>
  )

  return (
    <Page hero={hero}>
      <Section
        index="01"
        title="A day at rest"
        description="The twelve carts that parked longest — every stop, drive and charge across the operating day."
        actions={
          <Segmented
            size="sm"
            value={timelineDay}
            onChange={setTimelineDay}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
            ]}
          />
        }
      >
        <Card className="p-5 sm:p-7">
          {lanes.length ? <DayTimeline lanes={lanes} day={day} now={timelineDay === 'today' ? NOW : undefined} /> : <p className="py-16 text-center text-sm text-muted">No parking recorded yet.</p>}
        </Card>
      </Section>

      <Section index="02" title="Dwell & places" description="How long carts stay, and where they stop most.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Parking events by dwell time</p>
            <div className="-mx-2 mt-5">
              <ColumnChart data={data.bins} dataKey="events" unit="events" colors={ORDINAL_GOLD_5} height={250} />
            </div>
          </Card>
          <Card className="p-6 sm:p-7">
            <p className="eyebrow">Busiest stops</p>
            <div className="mt-6">
              <BarList items={data.locations.map(([loc, n]) => ({ key: loc, label: loc, value: n }))} format={fInt} unit="stops" />
            </div>
          </Card>
        </div>
      </Section>

      <Section
        index="03"
        title="Stops"
        description={`${fmt.int(rows.length)} events · ${period.label}`}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <ExportMenu name="parking" title="Parking report" subtitle={period.label} columns={exportColumns} rows={rows} />
          </>
        }
      >
        {view === 'feed' ? (
          <motion.div variants={fadeUp}>
            <Feed
              items={rows}
              date={parkDate}
              rowKey={parkKey}
              noun="stops"
              daySummary={daySummary}
              renderRow={(p) => (
                <FeedRow className="grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_minmax(0,230px)_minmax(0,1fr)_auto]">
                  <TimeBlock start={p.start} end={p.end} minutes={p.durationMin} />
                  <VehicleChip vehicleId={p.vehicleId} code={p.code} />
                  <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-3 lg:col-span-1">
                    <span className="text-[14px] text-ink">{p.location}</span>
                    <ZonePill inZone={p.inZone} />
                    <span className="relative hidden h-1 w-40 overflow-hidden rounded-full bg-surface-3 sm:block" title="Dwell relative to three hours">
                      <span className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${Math.min(100, (p.durationMin / 180) * 100)}%` }} />
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-6 lg:col-span-1">
                    <Metric value={clockDuration(p.durationMin * 60)} label="Dwell" />
                    <Metric value={`${p.soc}%`} label="Battery" />
                  </div>
                </FeedRow>
              )}
            />
          </motion.div>
        ) : (
          <DataTable data={rows} columns={columns} getRowId={parkKey} initialSort={[{ id: 'date', desc: true }]} />
        )}
      </Section>
    </Page>
  )
}
