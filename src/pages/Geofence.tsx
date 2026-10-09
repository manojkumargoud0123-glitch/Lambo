import { createColumnHelper } from '@tanstack/react-table'
import { format } from 'date-fns'
import type { Map as LeafletMap } from 'leaflet'
import { motion } from 'motion/react'
import { ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Feed, FeedRow } from '@/components/feed/Feed'
import { Metric, TimeBlock, VehicleChip } from '@/components/feed/parts'
import { ViewToggle, type FeedView } from '@/components/feed/ViewToggle'
import { FilterBar } from '@/components/filters/FilterBar'
import { usePeriodFilters } from '@/components/filters/usePeriodFilters'
import { Page } from '@/components/layout/Page'
import { Em } from '@/components/layout/PageHero'
import { Section } from '@/components/layout/Section'
import { GeoLayer } from '@/components/map/GeoLayer'
import { HtmlMarker } from '@/components/map/HtmlMarker'
import { MapControls } from '@/components/map/MapControls'
import { MapView, llBounds, type Basemap } from '@/components/map/MapView'
import { ZONE_COLOR, geofenceCollection, geofenceStyle } from '@/components/map/geofenceLayers'
import { DataTable, type Columns } from '@/components/table/DataTable'
import { ExportMenu } from '@/components/table/ExportMenu'
import { Pill, SiteCell, VehicleCell } from '@/components/table/cells'
import { EASE, fadeUp } from '@/components/ui/motion'
import { Select } from '@/components/ui/Select'
import { Spec, SpecStrip } from '@/components/ui/Spec'
import { STATUS_META } from '@/components/ui/status'
import { delta, filterBy, previousPeriod } from '@/data/analytics'
import { GEOFENCES, SITES, SITE_BY_ID } from '@/data/catalog'
import { GEOFENCE_EVENTS } from '@/data/fleet'
import type { Geofence as Zone, GeofenceEvent, ZoneKind } from '@/data/types'
import type { ExportColumn } from '@/lib/export'
import { cn } from '@/lib/cn'
import { dateLabel, fmt, minutesLabel, timeLabel } from '@/lib/format'
import { boundsOf, inside } from '@/lib/geo'
import { useLiveFleet } from '@/state/liveFleet'

const KINDS: ZoneKind[] = ['Boundary', 'Hospitality', 'Charging', 'Service', 'Restricted']
const fInt = (n: number) => fmt.int(n)
const eventDate = (e: GeofenceEvent) => e.entry
const eventKey = (e: GeofenceEvent) => e.id
const daySummary = (rows: GeofenceEvent[]) => `${rows.filter((r) => r.alert).length} alerts`
const SITE_OPTIONS = SITES.map((s) => ({ value: s.id, label: s.name, hint: s.city }))

const AlertBadge = ({ alert }: { alert: GeofenceEvent['alert'] }) =>
  alert ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-bad/40 bg-bad/10 px-2.5 py-1 text-[11px] text-bad">
      <ShieldAlert className="size-3" />
      {alert}
    </span>
  ) : null

const col = createColumnHelper<GeofenceEvent>()
const columns: Columns<GeofenceEvent> = [
  col.accessor('entry', { id: 'date', header: 'Date', cell: (c) => dateLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('code', { header: 'Vehicle', cell: (c) => <VehicleCell vehicleId={c.row.original.vehicleId} code={c.getValue()} />, enableHiding: false }),
  col.accessor('zone', { header: 'Geofence', cell: (c) => <span className="text-ink">{c.getValue()}</span> }),
  col.accessor('kind', { header: 'Type', cell: (c) => <Pill color={ZONE_COLOR[c.row.original.kind]}>{c.row.original.kind}</Pill> }),
  col.accessor((e) => SITE_BY_ID[e.siteId].name, { id: 'property', header: 'Property', cell: (c) => <SiteCell siteId={c.row.original.siteId} /> }),
  col.accessor('entry', { id: 'in', header: 'Time in', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('exit', { header: 'Time out', cell: (c) => timeLabel(c.getValue()), sortingFn: 'datetime' }),
  col.accessor('dwellMin', { header: 'Dwell', cell: (c) => minutesLabel(c.getValue()), meta: { align: 'right' } }),
  col.accessor((e) => e.alert ?? '', { id: 'alert', header: 'Alert', cell: (c) => (c.row.original.alert ? <AlertBadge alert={c.row.original.alert} /> : <span className="text-faint">—</span>) }),
]

const exportColumns: ExportColumn<GeofenceEvent>[] = [
  { header: 'Date', value: (e) => dateLabel(e.entry) },
  { header: 'Vehicle', value: (e) => e.code },
  { header: 'Geofence', value: (e) => e.zone },
  { header: 'Type', value: (e) => e.kind },
  { header: 'Property', value: (e) => SITE_BY_ID[e.siteId].name },
  { header: 'Time in', value: (e) => timeLabel(e.entry) },
  { header: 'Time out', value: (e) => timeLabel(e.exit) },
  { header: 'Dwell (min)', value: (e) => e.dwellMin },
  { header: 'Alert', value: (e) => e.alert ?? '' },
]

export default function Geofence() {
  const filters = usePeriodFilters('7d')
  const { period, site, query } = filters
  const [mapSite, setMapSite] = useState(SITES[0].id)
  const activeSite = site !== 'all' ? site : mapSite
  const [highlight, setHighlight] = useState<string | null>(null)
  const [view, setView] = useState<FeedView>('feed')
  const [only, setOnly] = useState<'all' | 'alerts'>('all')
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [basemap, setBasemap] = useState<Basemap>('satellite')

  const data = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (e: GeofenceEvent) => !q || `${e.code} ${e.zone} ${e.kind} ${SITE_BY_ID[e.siteId].name}`.toLowerCase().includes(q)
    const rows = filterBy(GEOFENCE_EVENTS, period, site).filter(match)
    const prevRows = filterBy(GEOFENCE_EVENTS, previousPeriod(period), site).filter(match)
    const summarize = (r: GeofenceEvent[]) => ({ entries: r.length, alerts: r.filter((e) => e.alert).length, dwell: r.length ? r.reduce((s, e) => s + e.dwellMin, 0) / r.length : 0 })
    const entriesByZone = new Map<string, number>()
    for (const r of rows) entriesByZone.set(r.geofenceId, (entriesByZone.get(r.geofenceId) ?? 0) + 1)
    return { rows, alerts: rows.filter((r) => r.alert), sum: summarize(rows), prev: summarize(prevRows), entriesByZone }
  }, [period, site, query])

  const zones = useMemo(() => GEOFENCES.filter((g) => g.siteId === activeSite), [activeSite])
  const collection = useMemo(() => geofenceCollection(zones, highlight), [zones, highlight])
  const boundary = zones.find((z) => z.kind === 'Boundary')!
  const zoneCount = site === 'all' ? GEOFENCES.length : GEOFENCES.filter((g) => g.siteId === site).length
  const siteInfo = SITE_BY_ID[activeSite]

  useEffect(() => {
    if (!map) return
    const target = zones.find((z) => z.id === highlight) ?? boundary
    const pad = target === boundary ? 40 : 160
    map.flyToBounds(llBounds(boundsOf(target.polygon)), { paddingTopLeft: [pad, pad + 40], paddingBottomRight: [pad, pad], duration: 1.4 })
  }, [map, zones, highlight, boundary])

  const focusZone = (id: string) => {
    setHighlight((h) => (h === id ? null : id))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const tableRows = only === 'alerts' ? data.alerts : data.rows

  const hero = (
    <section data-theme="dark" className="relative mx-2 mt-2 h-[82vh] min-h-[600px] overflow-hidden rounded-[34px] bg-[#080807] sm:mx-3 sm:mt-3">
      <MapView className="absolute inset-0" bounds={boundsOf(boundary.polygon)} padding={40} basemap={basemap} onReady={setMap}>
        <GeoLayer data={collection} style={geofenceStyle} onFeatureClick={(f) => setHighlight((h) => (String(f.properties?.id) === h ? null : String(f.properties?.id)))} />
        {zones
          .filter((z) => z.kind !== 'Boundary')
          .map((z) => (
            <HtmlMarker key={z.id} at={z.center} anchor="bottom">
              <button type="button" onClick={() => setHighlight(z.id === highlight ? null : z.id)} className="glass mb-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] text-ink">
                <span className="mr-1.5 inline-block size-1.5 rounded-full align-middle" style={{ background: ZONE_COLOR[z.kind] }} />
                {z.name}
              </button>
            </HtmlMarker>
          ))}
        <LiveDots siteId={activeSite} />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#080807]/90 via-transparent to-[#080807]/50" />
        <div className="absolute bottom-5 right-4 z-10 sm:right-6">
          <MapControls basemap={basemap} setBasemap={setBasemap} onFitAll={() => setHighlight(null)} />
        </div>
      </MapView>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-5 pb-8 sm:px-8 lg:px-12">
        <motion.p className="eyebrow flex items-center gap-3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}>
          <span className="text-gold">06</span>
          <span className="h-px w-10 bg-gold/50" />
          Fleet operations · {siteInfo.kind}
        </motion.p>
        <h1 className="mt-4 overflow-hidden font-wide text-[clamp(2.6rem,7vw,6.2rem)] font-light uppercase leading-[0.92]">
          <motion.span className="metal-text inline-block" initial={{ y: '108%' }} animate={{ y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.12 }}>
            Geofence
          </motion.span>
        </h1>
        <motion.div className="mt-4 max-w-xl text-[16px] text-ink-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}>
          <Em>{zones.length}</Em> zones shape <Em>{siteInfo.name}</Em>, {siteInfo.city}. Carts crossed them <Em>{fmt.int(data.sum.entries)}</Em> times in {period.label.toLowerCase()}.
        </motion.div>
      </div>

      {/* Top row sits below the floating header; dropdowns open downward into the map, so nothing is clipped. */}
      <motion.div
        className="absolute inset-x-0 top-[100px] z-20 flex flex-wrap items-center gap-2 px-5 sm:px-8 lg:px-12"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
      >
        {site === 'all' && (
          <Select
            value={mapSite}
            onChange={(v) => {
              setHighlight(null)
              setMapSite(v)
            }}
            options={SITE_OPTIONS}
            label="Property"
            className="w-[270px]"
          />
        )}
        {KINDS.map((k) => (
          <Pill key={k} color={ZONE_COLOR[k]} className="bg-black/50 backdrop-blur">
            {k}
          </Pill>
        ))}
      </motion.div>
    </section>
  )

  return (
    <Page hero={hero}>
      <motion.div variants={fadeUp} className="mt-10">
        <FilterBar filters={filters} search searchPlaceholder="Vehicle or zone…" />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-8">
        <SpecStrip>
          <Spec label="Geofences" value={zoneCount} format={fInt} note={site === 'all' ? `Across ${SITES.length} properties` : SITE_BY_ID[site].name} />
          <Spec label="Entries" value={data.sum.entries} format={fInt} delta={delta(data.sum.entries, data.prev.entries)} />
          <Spec label="Alerts" value={data.sum.alerts} format={fInt} delta={delta(data.sum.alerts, data.prev.alerts)} upIsGood={false} />
          <Spec label="Average dwell" value={data.sum.dwell} format={minutesLabel} delta={delta(data.sum.dwell, data.prev.dwell)} />
        </SpecStrip>
      </motion.div>

      <Section index="01" title={`Zones at ${siteInfo.name}`} description="Select a zone to fly the map to it.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {zones.map((z, i) => (
            <ZoneCard key={z.id} zone={z} active={z.id === highlight} entries={data.entriesByZone.get(z.id) ?? 0} onClick={() => focusZone(z.id)} delay={i * 60} />
          ))}
        </div>
      </Section>

      <Section index="02" title="Alerts" description={data.alerts.length ? 'Restricted-zone entries and overspeed inside hospitality zones.' : 'No alerts in this period.'}>
        {data.alerts.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.alerts.slice(0, 6).map((a, i) => (
              <div key={a.id} className="card rise flex items-center gap-4 p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-bad/30 bg-bad/10 text-bad">
                  <ShieldAlert className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-ink">
                    {a.alert} · {a.zone}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-muted">
                    {a.code} · {SITE_BY_ID[a.siteId].name}
                  </p>
                </div>
                <div className="text-right text-[12px] tabular-nums">
                  <p className="text-ink-2">{format(a.entry, 'dd MMM, HH:mm')}</p>
                  <p className="text-muted">{minutesLabel(a.dwellMin)} inside</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        index="03"
        title="Crossings"
        description={`${fmt.int(tableRows.length)} events · ${period.label}`}
        actions={
          <>
            <ViewToggle value={view} onChange={setView} />
            <button
              type="button"
              onClick={() => setOnly((o) => (o === 'all' ? 'alerts' : 'all'))}
              className={cn('h-8 rounded-full border px-3.5 font-wide text-[9.5px] uppercase tracking-[0.14em] transition-colors', only === 'alerts' ? 'border-bad/50 bg-bad/10 text-bad' : 'border-line text-muted hover:text-ink-2')}
            >
              Alerts only
            </button>
            <ExportMenu name="geofence-events" title="Geofence events" subtitle={period.label} columns={exportColumns} rows={tableRows} />
          </>
        }
      >
        {view === 'feed' ? (
          <motion.div variants={fadeUp}>
            <Feed
              items={tableRows}
              date={eventDate}
              rowKey={eventKey}
              noun="crossings"
              daySummary={daySummary}
              renderRow={(e) => (
                <FeedRow className="grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[76px_minmax(0,230px)_minmax(0,1fr)_auto]">
                  <TimeBlock start={e.entry} end={e.exit} minutes={e.dwellMin} />
                  <VehicleChip vehicleId={e.vehicleId} code={e.code} />
                  <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-3 lg:col-span-1">
                    <span className="text-[14px] text-ink">{e.zone}</span>
                    <Pill color={ZONE_COLOR[e.kind]}>{e.kind}</Pill>
                    <AlertBadge alert={e.alert} />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-6 lg:col-span-1">
                    <Metric value={SITE_BY_ID[e.siteId].name} label={SITE_BY_ID[e.siteId].city} />
                  </div>
                </FeedRow>
              )}
            />
          </motion.div>
        ) : (
          <DataTable data={tableRows} columns={columns} getRowId={eventKey} initialSort={[{ id: 'date', desc: true }]} />
        )}
      </Section>
    </Page>
  )
}

/** Live cart positions on the zone map — isolated so only these markers re-render each tick. */
function LiveDots({ siteId }: { siteId: string }) {
  const live = useLiveFleet()
  return (
    <>
      {live
        .filter((v) => v.siteId === siteId)
        .map((v) => (
          <HtmlMarker key={v.id} at={v.position} glide={v.status === 'moving'}>
            <span className="block size-3 rounded-full border-2 border-white shadow-[0_0_0_3px_rgba(0,0,0,0.25)]" style={{ background: STATUS_META[v.status].color }} title={`${v.code} · ${STATUS_META[v.status].label}`} />
          </HtmlMarker>
        ))}
    </>
  )
}

function ZoneCard({ zone, active, entries, onClick, delay }: { zone: Zone; active: boolean; entries: number; onClick: () => void; delay: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('card rise group p-5 text-left transition-colors duration-300', active ? 'border-gold/60' : 'hover:border-line-strong')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="flex items-center gap-2 text-[12px] text-muted">
            <span className="size-2 rounded-[3px]" style={{ background: ZONE_COLOR[zone.kind] }} />
            {zone.kind}
          </span>
          <span className="mt-2 block text-[15px] text-ink">{zone.name}</span>
        </span>
        <InsideNow zone={zone} />
      </span>
      <span className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[12px]">
        <span>
          <span className="block tabular-nums text-ink-2">{fmt.int(entries)}</span>
          <span className="eyebrow text-[7px]">Entries</span>
        </span>
        <span>
          <span className="block tabular-nums text-ink-2">{zone.areaHa} ha</span>
          <span className="eyebrow text-[7px]">Area</span>
        </span>
        <span>
          <span className="block text-ink-2">{zone.speedLimit ? `${zone.speedLimit} km/h` : 'No entry'}</span>
          <span className="eyebrow text-[7px]">Limit</span>
        </span>
      </span>
    </button>
  )
}

function InsideNow({ zone }: { zone: Zone }) {
  const live = useLiveFleet()
  const n = live.filter((v) => v.siteId === zone.siteId && inside(v.position, zone.polygon)).length
  return (
    <span className="text-right">
      <span className="block text-2xl font-extralight tabular-nums text-ink">{n}</span>
      <span className="eyebrow text-[7px]">Inside now</span>
    </span>
  )
}
