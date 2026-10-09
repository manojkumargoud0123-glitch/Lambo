import { createColumnHelper } from '@tanstack/react-table'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { BarList } from '@/components/charts/BarList'
import { RadialHours } from '@/components/charts/RadialHours'
import { Feed, FeedRow } from '@/components/feed/Feed'
import { BatteryGlyph, Metric, TimeBlock, VehicleChip } from '@/components/feed/parts'
import { ViewToggle, type FeedView } from '@/components/feed/ViewToggle'
import { FilterBar } from '@/components/filters/FilterBar'
import { usePeriodFilters } from '@/components/filters/usePeriodFilters'
import { Page } from '@/components/layout/Page'
import { Em, PageHero } from '@/components/layout/PageHero'
import { Section } from '@/components/layout/Section'
import { DataTable, type Columns } from '@/components/table/DataTable'
import { ExportMenu } from '@/components/table/ExportMenu'
import { Pill, SiteCell, VehicleCell } from '@/components/table/cells'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Card } from '@/components/ui/Card'
import { SocBar } from '@/components/ui/Gauge'
import { EASE, fadeUp } from '@/components/ui/motion'
import { Spec, SpecStrip } from '@/components/ui/Spec'
import { chargeSummary, delta, filterBy, previousPeriod } from '@/data/analytics'
import { SITES, SITE_BY_ID } from '@/data/catalog'
import { CHARGES } from '@/data/fleet'
import type { ChargeSession } from '@/data/types'
import type { ExportColumn } from '@/lib/export'
import { clockDuration, dateLabel, fmt, minutesLabel, timeLabel } from '@/lib/format'

const fInt = (n: number) => fmt.int(n)
const chargeDate = (s: ChargeSession) => s.start
const chargeKey = (s: ChargeSession) => s.id
const daySummary = (rows: ChargeSession[]) => `${fmt.int(rows.reduce((s, c) => s + c.energyKwh, 0))} kWh`

const col = createColumnHelper<ChargeSession>()
const columns: Columns<ChargeSession> = [
  col.accessor('code', { header: 'Vehicle', cell: (c) => <VehicleCell vehicleId={c.row.original.vehicleId} code={c.getValue()} />, enableHiding: false }),
  col.accessor((s) => SITE_BY_ID[s.siteId].name, { id: 'property', header: 'Property', cell: (c) => <SiteCell siteId={c.row.original.siteId} /> }),
  col.accessor('charger', { header: 'Charger' }),
  col.accessor('type', { header: 'Type', cell: (c) => <TypePill type={c.row.original.type} /> }),
  col.accessor('start', { id: 'date', header: 'Date', cell: (c) => dateLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('start', { id: 'startTime', header: 'Start', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('end', { header: 'End', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('durationMin', { header: 'Duration', cell: (c) => clockDuration(c.getValue() * 60), meta: { align: 'right' } }),
  col.accessor((s) => s.endSoc - s.startSoc, { id: 'soc', header: 'SoC', cell: (c) => <SocBar start={c.row.original.startSoc} end={c.row.original.endSoc} className="w-28" /> }),
  col.accessor('energyKwh', { header: 'Energy', cell: (c) => <span className="text-ink">{c.getValue().toFixed(2)} kWh</span>, meta: { align: 'right' } }),
  col.accessor('cost', { header: 'Cost', cell: (c) => fmt.inr(c.getValue()), meta: { align: 'right' } }),
]

const exportColumns: ExportColumn<ChargeSession>[] = [
  { header: 'Session ID', value: (s) => s.id },
  { header: 'Vehicle', value: (s) => s.code },
  { header: 'Property', value: (s) => SITE_BY_ID[s.siteId].name },
  { header: 'Charger', value: (s) => s.charger },
  { header: 'Type', value: (s) => s.type },
  { header: 'Date', value: (s) => dateLabel(s.start) },
  { header: 'Start', value: (s) => timeLabel(s.start) },
  { header: 'End', value: (s) => timeLabel(s.end) },
  { header: 'Duration', value: (s) => clockDuration(s.durationMin * 60) },
  { header: 'Start SoC (%)', value: (s) => s.startSoc },
  { header: 'End SoC (%)', value: (s) => s.endSoc },
  { header: 'Energy (kWh)', value: (s) => s.energyKwh },
  { header: 'Cost (INR)', value: (s) => s.cost },
]

function TypePill({ type }: { type: ChargeSession['type'] }) {
  return <Pill color={type === 'Fast' ? 'var(--charging)' : 'var(--muted)'}>{type === 'Fast' ? 'Fast · 3.3 kW' : 'Standard · 1.6 kW'}</Pill>
}

export default function Charging() {
  const filters = usePeriodFilters('7d')
  const { period, site, query } = filters
  const [view, setView] = useState<FeedView>('feed')

  const data = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (s: ChargeSession) => !q || `${s.code} ${s.charger} ${SITE_BY_ID[s.siteId].name}`.toLowerCase().includes(q)
    const rows = filterBy(CHARGES, period, site).filter(match)
    const prevRows = filterBy(CHARGES, previousPeriod(period), site).filter(match)
    const hours = new Array<number>(24).fill(0)
    for (const s of rows) hours[s.start.getHours()]++
    const perSite = SITES.map((st) => ({ site: st, energy: rows.filter((r) => r.siteId === st.id).reduce((a, r) => a + r.energyKwh, 0) }))
      .filter((r) => r.energy > 0)
      .sort((a, b) => b.energy - a.energy)
    return { rows, sum: chargeSummary(rows), prev: chargeSummary(prevRows), hours, perSite }
  }, [period, site, query])

  const { rows, sum, prev } = data
  const fastShare = sum.sessions ? (sum.fast / sum.sessions) * 100 : 0

  const hero = (
    <PageHero
      index="04"
      eyebrow="Fleet operations"
      title="Charging"
      variant="split"
      image="/media/details/cockpit.webp"
      imagePosition="30% 60%"
      narrative={
        <>
          <Em>{fmt.int(sum.sessions)}</Em> sessions drew <Em>{fmt.int(sum.energy)} kWh</Em> from the grid in <Em>{period.label.toLowerCase()}</Em> — each lifting a battery by an average of{' '}
          <Em>{sum.avgGain.toFixed(0)}%</Em> in <Em>{minutesLabel(sum.avgDuration)}</Em>.
        </>
      }
      filters={<FilterBar filters={filters} search searchPlaceholder="Vehicle or charger…" />}
    >
      <SpecStrip>
        <Spec label="Sessions" value={sum.sessions} format={fInt} delta={delta(sum.sessions, prev.sessions)} />
        <Spec label="Energy drawn" value={sum.energy} unit="kWh" format={fInt} delta={delta(sum.energy, prev.energy)} upIsGood={false} />
        <Spec label="Energy cost" value={sum.cost} format={fmt.inr} delta={delta(sum.cost, prev.cost)} upIsGood={false} />
        <Spec label="Average session" value={sum.avgDuration} format={minutesLabel} delta={delta(sum.avgDuration, prev.avgDuration)} upIsGood={false} />
      </SpecStrip>
    </PageHero>
  )

  return (
    <Page hero={hero}>
      <Section index="01" title="The charging day" description="When carts plug in, which chargers they use, and where the energy goes.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="grid place-items-center p-6 sm:p-8">
            <p className="eyebrow mb-2 self-start">Sessions by hour · hover the clock</p>
            <RadialHours values={data.hours} unit="sessions" />
          </Card>
          <div className="grid gap-4">
            <Card className="p-6 sm:p-7">
              <p className="eyebrow">Charger mix</p>
              <div className="mt-5 grid grid-cols-2 gap-6">
                <div>
                  <TypePill type="Fast" />
                  <p className="mt-3 flex items-baseline gap-2">
                    <AnimatedNumber value={sum.fast} format={fInt} className="text-4xl font-extralight text-ink" />
                    <span className="text-[13px] text-muted">{fastShare.toFixed(0)}%</span>
                  </p>
                </div>
                <div>
                  <TypePill type="Standard" />
                  <p className="mt-3 flex items-baseline gap-2">
                    <AnimatedNumber value={sum.sessions - sum.fast} format={fInt} className="text-4xl font-extralight text-ink" />
                    <span className="text-[13px] text-muted">{(100 - fastShare).toFixed(0)}%</span>
                  </p>
                </div>
              </div>
              <div className="mt-5 flex h-2 gap-[2px] overflow-hidden rounded-full">
                <motion.span className="h-full rounded-l-full bg-charging" initial={{ flexGrow: 0 }} animate={{ flexGrow: fastShare || 0.001 }} transition={{ duration: 1.1, ease: EASE }} />
                <motion.span className="h-full rounded-r-full bg-muted" initial={{ flexGrow: 0 }} animate={{ flexGrow: 100 - fastShare || 0.001 }} transition={{ duration: 1.1, ease: EASE }} />
              </div>
            </Card>
            <Card className="p-6 sm:p-7">
              <p className="eyebrow">Energy by property</p>
              <div className="mt-6">
                <BarList items={data.perSite.slice(0, 5).map((r) => ({ key: r.site.id, label: r.site.name, sub: r.site.city, value: r.energy }))} format={fInt} unit="kWh" />
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        index="02"
        title="Sessions"
        description={`${fmt.int(rows.length)} sessions · ${period.label}`}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <ExportMenu name="charging" title="Charging report" subtitle={period.label} columns={exportColumns} rows={rows} />
          </>
        }
      >
        {view === 'feed' ? (
          <motion.div variants={fadeUp}>
            <Feed
              items={rows}
              date={chargeDate}
              rowKey={chargeKey}
              noun="sessions"
              daySummary={daySummary}
              renderRow={(s) => (
                <FeedRow className="grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_minmax(0,230px)_minmax(0,1fr)_auto]">
                  <TimeBlock start={s.start} end={s.end} minutes={s.durationMin} />
                  <VehicleChip vehicleId={s.vehicleId} code={s.code} />
                  <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-3 lg:col-span-1">
                    <BatteryGlyph start={s.startSoc} end={s.endSoc} className="w-full max-w-[300px]" />
                    <TypePill type={s.type} />
                    <span className="text-[12px] text-muted">{s.charger}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-6 lg:col-span-1">
                    <Metric value={s.energyKwh.toFixed(2)} unit="kWh" label="Energy" />
                    <Metric value={fmt.inr(s.cost)} label="Cost" />
                  </div>
                </FeedRow>
              )}
            />
          </motion.div>
        ) : (
          <DataTable data={rows} columns={columns} getRowId={chargeKey} initialSort={[{ id: 'date', desc: true }]} />
        )}
      </Section>
    </Page>
  )
}
