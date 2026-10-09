import { AnimatePresence, motion } from 'motion/react'
import { ChartSpline, Crosshair, List, MapPin, Route, X } from 'lucide-react'
import type { Map as LeafletMap } from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Shield } from '@/components/brand/Logo'
import { GeoLayer } from '@/components/map/GeoLayer'
import { HtmlMarker } from '@/components/map/HtmlMarker'
import { MapControls } from '@/components/map/MapControls'
import { MapView, flyWithOffset, llBounds, type Basemap } from '@/components/map/MapView'
import { SitePin, VehiclePin } from '@/components/map/markers'
import { geofenceCollection, geofenceStyle } from '@/components/map/geofenceLayers'
import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { Button } from '@/components/ui/Button'
import { BatteryMeter } from '@/components/ui/Gauge'
import { SearchInput } from '@/components/ui/SearchInput'
import { STATUS_META, STATUS_ORDER, StatusBadge, StatusDot } from '@/components/ui/status'
import { statusCounts } from '@/data/analytics'
import { GEOFENCES, MODEL_IMAGE, SITE_BY_ID, SITES } from '@/data/catalog'
import { TODAY, TRIPS } from '@/data/fleet'
import type { LngLat, Site, Vehicle, VehicleStatus } from '@/data/types'
import { cn } from '@/lib/cn'
import { fmt, relativeMinutes } from '@/lib/format'
import { boundsOf } from '@/lib/geo'
import { useLiveFleet } from '@/state/liveFleet'
import { useQueryState } from '@/state/useQueryState'

const VEHICLE_ZOOM = 12
const SITE_ZOOM = 16
const CART_ZOOM = 18
const ALL_BOUNDS = llBounds(boundsOf(SITES.map((s) => s.center)))
const ZONES = geofenceCollection(GEOFENCES)
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

export default function LiveMap() {
  const vehicles = useLiveFleet()
  const [selectedId, setSelectedId] = useQueryState<string>('v', '')
  const [focusSite] = useQueryState<string>('site', '')
  const [status, setStatus] = useState<VehicleStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [basemap, setBasemap] = useState<Basemap>('satellite')
  const [zones, setZones] = useState(false)
  const [follow, setFollow] = useState(false)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [close, setClose] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  const counts = useMemo(() => statusCounts(vehicles), [vehicles])
  const selected = vehicles.find((v) => v.id === selectedId) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vehicles
      .filter((v) => status === 'all' || v.status === status)
      .filter((v) => !q || `${v.code} ${v.driver ?? ''} ${v.model.name} ${SITE_BY_ID[v.siteId].name} ${SITE_BY_ID[v.siteId].city}`.toLowerCase().includes(q))
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.code.localeCompare(b.code))
  }, [vehicles, status, query])

  const siteCounts = useMemo(() => {
    const out: Record<string, Record<VehicleStatus, number>> = {}
    for (const s of SITES) out[s.id] = { moving: 0, idle: 0, charging: 0, parked: 0, offline: 0 }
    for (const v of filtered) out[v.siteId][v.status]++
    return out
  }, [filtered])

  // ── Camera ──
  const fitAll = useCallback(
    (duration = 1.8) => {
      if (!map) return
      const desktop = isDesktop()
      map.flyToBounds(ALL_BOUNDS, {
        paddingTopLeft: desktop ? [460, 220] : [50, 200],
        paddingBottomRight: desktop ? [120, 120] : [50, 140],
        duration,
        maxZoom: 7,
      })
    },
    [map],
  )

  const flyToSite = useCallback(
    (site: Site) => {
      if (map) flyWithOffset(map, site.center, SITE_ZOOM, isDesktop() ? [180, 40] : [0, 0], 2.4)
    },
    [map],
  )

  const flyToVehicle = useCallback(
    (at: LngLat) => {
      if (map) flyWithOffset(map, at, CART_ZOOM, isDesktop() ? [-20, 60] : [0, -140], 2)
    },
    [map],
  )

  const select = (v: Vehicle) => {
    setSelectedId(v.id)
    setListOpen(false)
    flyToVehicle(v.position)
  }

  // Swap property clusters for individual carts past a zoom threshold.
  const onReady = useCallback((m: LeafletMap) => {
    setMap(m)
    const sync = () => setClose(m.getZoom() >= VEHICLE_ZOOM)
    m.on('zoomend', sync)
    sync()
  }, [])

  // Opening choreography / deep links.
  const opened = useRef(false)
  useEffect(() => {
    if (!map || opened.current) return
    opened.current = true
    const v = vehicles.find((x) => x.id === selectedId)
    const s = SITE_BY_ID[focusSite]
    const t = setTimeout(() => (v ? flyToVehicle(v.position) : s ? flyToSite(s) : fitAll(2.4)), 350)
    return () => clearTimeout(t)
  }, [map, vehicles, selectedId, focusSite, fitAll, flyToSite, flyToVehicle])

  // Follow camera.
  const [fLng, fLat] = selected?.position ?? [0, 0]
  useEffect(() => {
    if (!follow || !map || !selected) return
    map.panTo([fLat, fLng], { animate: true, duration: 0.95, easeLinearity: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follow, map, fLng, fLat])

  const todayStats = useMemo(() => {
    if (!selected) return null
    const own = TRIPS.filter((t) => t.vehicleId === selected.id && t.start >= TODAY)
    return { trips: own.length, distance: own.reduce((s, t) => s + t.distanceKm, 0), energy: own.reduce((s, t) => s + t.energyKwh, 0) }
  }, [selected])

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView className="absolute inset-0" center={[79.5, 21]} zoom={4.5} basemap={basemap} onReady={onReady}>
        {zones && <GeoLayer data={ZONES} style={geofenceStyle} />}
        {!close &&
          SITES.map((s) => (
            <HtmlMarker key={s.id} at={s.center}>
              <SitePin site={s} counts={siteCounts[s.id]} onClick={() => flyToSite(s)} />
            </HtmlMarker>
          ))}
        {close &&
          filtered.map((v) => (
            <HtmlMarker key={v.id} at={v.position} glide={v.status === 'moving'} zIndex={v.id === selectedId ? 10 : v.status === 'moving' ? 2 : 1}>
              <VehiclePin vehicle={v} selected={v.id === selectedId} onClick={() => select(v)} />
            </HtmlMarker>
          ))}
        <div
          className={cn(
            'absolute z-10 transition-[right] duration-500 ease-lux max-lg:top-[176px]',
            selected ? 'right-3 max-lg:hidden lg:bottom-4 lg:right-[436px]' : 'right-3 sm:right-4 lg:bottom-4',
          )}
        >
          <MapControls basemap={basemap} setBasemap={setBasemap} zones={zones} setZones={setZones} onFitAll={() => fitAll()} />
        </div>
      </MapView>

      {/* Status ribbon */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="no-scrollbar absolute inset-x-3 top-[92px] z-10 flex gap-2 overflow-x-auto sm:inset-x-4 lg:left-[412px]"
      >
        <RibbonChip active={status === 'all'} onClick={() => setStatus('all')} label="Total fleet" count={vehicles.length} icon={<Shield className="h-4 w-auto" />} />
        {STATUS_ORDER.map((k) => {
          const Icon = STATUS_META[k].icon
          return (
            <RibbonChip
              key={k}
              active={status === k}
              onClick={() => setStatus(status === k ? 'all' : k)}
              label={STATUS_META[k].label}
              count={counts[k]}
              icon={
                <span className="grid size-6 place-items-center rounded-full" style={{ background: k === 'offline' ? 'transparent' : STATUS_META[k].color, border: k === 'offline' ? `1.5px solid ${STATUS_META[k].color}` : undefined }}>
                  <Icon className="size-3" strokeWidth={2.6} style={{ color: k === 'offline' ? STATUS_META[k].color : '#fff' }} />
                </span>
              }
            />
          )
        })}
      </motion.div>

      {/* Vehicle list (desktop panel / mobile sheet) */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'glass absolute z-20 flex-col overflow-hidden rounded-[28px]',
          'inset-x-2 bottom-2 top-[30%] lg:inset-x-auto lg:bottom-4 lg:left-4 lg:top-[92px] lg:w-[380px]',
          listOpen ? 'flex' : 'hidden lg:flex',
        )}
      >
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Live fleet</p>
              <p className="mt-1 text-sm text-ink-2">
                <span className="tabular-nums text-ink">{filtered.length}</span> of {vehicles.length} vehicles
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-2">
              <span className="relative flex size-2">
                <span className="pulse-ring absolute inset-0 rounded-full bg-good" />
                <span className="relative size-2 rounded-full bg-good" />
              </span>
              Live
            </span>
            <Button size="icon-sm" variant="ghost" className="lg:hidden" onClick={() => setListOpen(false)} aria-label="Close list">
              <X className="size-4" />
            </Button>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Vehicle, driver, property…" />
        </div>
        <ul className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
          {filtered.map((v) => (
            <li key={v.id}>
              <VehicleRow vehicle={v} active={v.id === selectedId} onClick={() => select(v)} />
            </li>
          ))}
          {filtered.length === 0 && <li className="py-16 text-center text-sm text-muted">No vehicles match.</li>}
        </ul>
      </motion.aside>

      {/* Mobile list trigger */}
      {!listOpen && !selected && (
        <Button variant="primary" className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 lg:hidden" onClick={() => setListOpen(true)}>
          <List className="size-4" />
          Vehicles · {filtered.length}
        </Button>
      )}

      {/* Property rail */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn('no-scrollbar absolute bottom-4 left-[412px] z-10 hidden gap-2 overflow-x-auto xl:flex', selected ? 'right-[436px]' : 'right-20')}
      >
        {SITES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => flyToSite(s)}
            className="glass group flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 transition-colors hover:border-gold/50"
          >
            <span className="grid size-7 place-items-center rounded-full bg-surface-3 text-[11px] tabular-nums text-ink">{vehicles.filter((v) => v.siteId === s.id).length}</span>
            <span className="text-left leading-tight">
              <span className="block font-wide text-[8.5px] font-medium uppercase tracking-[0.16em] text-ink">{s.name}</span>
              <span className="block text-[10px] text-muted">{s.city}</span>
            </span>
          </button>
        ))}
      </motion.div>

      {/* Detail */}
      <AnimatePresence mode="wait">
        {selected && (
          <VehicleDetail
            key={selected.id}
            vehicle={selected}
            follow={follow}
            setFollow={setFollow}
            today={todayStats}
            onRecenter={() => flyToVehicle(selected.position)}
            onClose={() => {
              setSelectedId(null)
              setFollow(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function RibbonChip({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count: number; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'glass group flex shrink-0 items-center gap-3 rounded-2xl py-2.5 pl-3 pr-5 text-left transition-all duration-500 ease-lux',
        active ? 'border-gold/60 bg-gold-wash' : 'hover:border-line-strong',
      )}
    >
      <span className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2">{icon}</span>
      <span>
        <AnimatedNumber value={count} className="block text-[22px] font-light leading-none text-ink" duration={0.8} />
        <span className="eyebrow mt-1 block text-[8.5px]">{label}</span>
      </span>
    </button>
  )
}

function VehicleRow({ vehicle: v, active, onClick }: { vehicle: Vehicle; active: boolean; onClick: () => void }) {
  const site = SITE_BY_ID[v.siteId]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition-all duration-300',
        active ? 'border-gold/50 bg-gold-wash' : 'border-transparent hover:border-line hover:bg-surface-2/70',
      )}
    >
      <span className="relative h-[52px] w-[78px] shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(120%_90%_at_50%_100%,var(--surface-3),var(--surface-2))]">
        <img src={MODEL_IMAGE[v.model.id]} alt="" loading="lazy" className="absolute inset-x-1.5 bottom-1.5 w-[calc(100%-12px)] object-contain transition-transform duration-500 group-hover:scale-105" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-wide text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink">{v.code}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-ink-2">
            <StatusDot status={v.status} />
            {STATUS_META[v.status].label}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted">
          {v.driver ?? 'Unassigned'} · {site.name}
        </span>
        <span className="mt-1.5 flex items-center gap-2.5">
          <BatteryMeter soc={v.soc} className="w-14" />
          <span className="text-[11px] tabular-nums text-ink-2">{Math.round(v.soc)}%</span>
          <span className="ml-auto text-[11px] tabular-nums text-muted">{v.status === 'moving' ? `${v.speed} km/h` : v.model.short}</span>
        </span>
      </span>
    </button>
  )
}

function VehicleDetail({ vehicle: v, follow, setFollow, today, onRecenter, onClose }: {
  vehicle: Vehicle
  follow: boolean
  setFollow: (f: boolean) => void
  today: { trips: number; distance: number; energy: number } | null
  onRecenter: () => void
  onClose: () => void
}) {
  const site = SITE_BY_ID[v.siteId]
  const range = (v.soc / 100) * v.model.rangeKm * (v.batteryHealth / 100)
  const metrics = [
    { label: 'Speed', value: v.speed, unit: 'km/h', format: (n: number) => Math.round(n).toString() },
    { label: 'Charge', value: v.soc, unit: '%', format: (n: number) => Math.round(n).toString() },
    { label: 'Range', value: range, unit: 'km', format: (n: number) => Math.round(n).toString() },
    { label: 'Pack temp', value: v.batteryTemp, unit: '°C', format: (n: number) => Math.round(n).toString() },
  ]
  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="glass absolute inset-x-2 bottom-2 z-30 flex max-h-[64dvh] flex-col overflow-hidden rounded-[28px] lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[184px] lg:max-h-none lg:w-[408px]"
    >
      <div className="flex-1 overflow-y-auto">
        {/* Showroom stage */}
        <div className="relative h-[200px] overflow-hidden bg-[radial-gradient(90%_80%_at_50%_100%,var(--surface-3),transparent_70%)]">
          <div className="absolute inset-x-0 bottom-[38px] h-px bg-gradient-to-r from-transparent via-line-strong to-transparent" />
          <motion.img
            src={MODEL_IMAGE[v.model.id]}
            alt={v.model.name}
            initial={{ x: 80, opacity: 0, scale: 0.94 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="absolute inset-x-8 bottom-[30px] mx-auto max-h-[150px] object-contain drop-shadow-[0_24px_20px_rgba(0,0,0,0.45)]"
          />
          <div className="absolute inset-x-5 top-5 flex items-start justify-between">
            <StatusBadge status={v.status} />
            <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close details" className="bg-surface/60 backdrop-blur">
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <p className="eyebrow">{v.model.name}</p>
          <h2 className="mt-1.5 font-wide text-[22px] font-light uppercase tracking-[0.04em] text-ink">{v.code}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            <MapPin className="size-3.5" />
            {site.name}, {site.city}
          </p>

          <div className="mt-5 grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-line bg-line">
            {metrics.map((m) => (
              <div key={m.label} className="bg-surface px-3 py-3.5">
                <p className="flex items-baseline gap-0.5">
                  <AnimatedNumber value={m.value} format={m.format} duration={0.6} className="text-xl font-light text-ink" />
                  <span className="text-[10px] text-muted">{m.unit}</span>
                </p>
                <p className="eyebrow mt-1 text-[8px]">{m.label}</p>
              </div>
            ))}
          </div>

          <BatteryMeter soc={v.soc} className="mt-4" />

          <dl className="mt-5 divide-y divide-line text-[13px]">
            {[
              ['Driver', v.driver ?? 'Unassigned'],
              ['Seats', `${v.model.seats}`],
              ['Odometer', `${fmt.one(v.odometer)} km`],
              ['Battery health', `${v.batteryHealth}% · ${v.model.batteryKwh} kWh`],
              ['Last update', relativeMinutes(v.lastSeenMin)],
              ['Position', `${v.position[1].toFixed(5)}, ${v.position[0].toFixed(5)}`],
            ].map(([k, val]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="tabular-nums text-ink-2">{val}</dd>
              </div>
            ))}
          </dl>

          {today && (
            <div className="mt-5 rounded-2xl border border-line bg-surface-2/50 p-4">
              <p className="eyebrow mb-3">Today</p>
              <div className="grid grid-cols-3 gap-3">
                <TodayStat value={today.trips} label="Trips" />
                <TodayStat value={today.distance} label="Km" format={(n) => n.toFixed(1)} />
                <TodayStat value={today.energy} label="kWh" format={(n) => n.toFixed(1)} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line p-3">
        <Button size="sm" variant={follow ? 'gold' : 'outline'} onClick={() => (follow ? setFollow(false) : (onRecenter(), setFollow(true)))}>
          <Crosshair className="size-3.5" />
          {follow ? 'Following' : 'Follow'}
        </Button>
        <Link to={`/analytics?view=vehicle&vehicle=${v.id}`} className="contents">
          <Button size="sm" variant="outline" className="w-full">
            <ChartSpline className="size-3.5" />
            Analytics
          </Button>
        </Link>
        <Link to={`/trips?q=${encodeURIComponent(v.code)}`} className="contents">
          <Button size="sm" variant="outline" className="w-full">
            <Route className="size-3.5" />
            Trips
          </Button>
        </Link>
      </div>
    </motion.aside>
  )
}

function TodayStat({ value, label, format }: { value: number; label: string; format?: (n: number) => string }) {
  return (
    <div>
      <AnimatedNumber value={value} format={format} className="block text-xl font-light text-ink" />
      <span className="eyebrow text-[8px]">{label}</span>
    </div>
  )
}
