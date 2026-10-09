import { offset, polygonAround, centroid, type LngLat } from '@/lib/geo'
import { createRng, hash } from '@/lib/random'
import type { Geofence, Model, Poi, Site, SiteKind, ZoneKind } from './types'

// ── Models (Genesis range) ──────────────────────────────────
export const MODELS: Model[] = [
  { id: 'g2s', name: 'Genesis Golf 2S', short: 'Golf 2S', seats: 2, batteryKwh: 5.1, rangeKm: 70, topSpeed: 25, efficiency: 13.4 },
  { id: 'g4s', name: 'Genesis Golf 4S', short: 'Golf 4S', seats: 4, batteryKwh: 7.2, rangeKm: 85, topSpeed: 25, efficiency: 11.8 },
  { id: 's42', name: 'Genesis Shuttle 4S2', short: 'Shuttle 4S2', seats: 6, batteryKwh: 7.2, rangeKm: 80, topSpeed: 25, efficiency: 11.1 },
  { id: 's62', name: 'Genesis Shuttle 6S2', short: 'Shuttle 6S2', seats: 8, batteryKwh: 10.8, rangeKm: 95, topSpeed: 25, efficiency: 8.8 },
]

export const MODEL_IMAGE: Record<string, string> = {
  g2s: '/media/models/golf-2s.webp',
  g4s: '/media/models/golf-4s.webp',
  s42: '/media/models/shuttle-4s2.webp',
  s62: '/media/models/shuttle-6s2.webp',
}

export const SITE_IMAGE: Record<SiteKind, string> = {
  'Golf Club': '/media/golf.webp',
  Resort: '/media/resort.webp',
  'Private Aviation': '/media/hangar.webp',
  'Heritage Estate': '/media/resort.webp',
}

export const DETAIL_SHOTS = [
  { src: '/media/details/cockpit.webp', label: 'Cockpit', note: 'SoC display · voltage · drive selector' },
  { src: '/media/details/wheel.webp', label: 'Chassis', note: 'Alloy wheels · coil-over suspension' },
  { src: '/media/details/cabin.webp', label: 'Cabin', note: 'Pedal set · cup holder · storage' },
  { src: '/media/details/canopy.webp', label: 'Canopy', note: 'Rooftop · folding windscreen' },
]

// ── Properties ──────────────────────────────────────────────
interface SiteSeed {
  id: string
  name: string
  city: string
  kind: SiteKind
  center: LngLat
  tariff: number
  fleet: number
  mix: Partial<Record<Model['id'], number>>
}

export const SITE_SEEDS: SiteSeed[] = [
  { id: 'agc', name: 'Aravalli Greens', city: 'Gurugram', kind: 'Golf Club', center: [77.1012, 28.4567], tariff: 9.2, fleet: 14, mix: { g2s: 0.45, g4s: 0.45, s42: 0.1 } },
  { id: 'ho1', name: 'Hangar One', city: 'New Delhi', kind: 'Private Aviation', center: [77.0878, 28.5642], tariff: 10.4, fleet: 8, mix: { s42: 0.4, s62: 0.6 } },
  { id: 'ape', name: 'Amber Palace Estate', city: 'Jaipur', kind: 'Heritage Estate', center: [75.8085, 26.8985], tariff: 8.6, fleet: 10, mix: { g4s: 0.3, s42: 0.4, s62: 0.3 } },
  { id: 'sly', name: 'Sahyadri Links', city: 'Pune', kind: 'Golf Club', center: [73.907, 18.559], tariff: 9.8, fleet: 10, mix: { g2s: 0.5, g4s: 0.4, s42: 0.1 } },
  { id: 'kbr', name: 'Konkan Bay Resort', city: 'Goa', kind: 'Resort', center: [73.935, 15.36], tariff: 8.9, fleet: 12, mix: { g4s: 0.2, s42: 0.45, s62: 0.35 } },
  { id: 'nrc', name: 'Nandi Ridge Club', city: 'Bengaluru', kind: 'Golf Club', center: [77.62, 13.052], tariff: 8.4, fleet: 12, mix: { g2s: 0.4, g4s: 0.45, s42: 0.15 } },
  { id: 'dfw', name: 'Deccan Fairways', city: 'Hyderabad', kind: 'Golf Club', center: [78.348, 17.415], tariff: 9.0, fleet: 10, mix: { g2s: 0.45, g4s: 0.45, s62: 0.1 } },
]

/** Points of interest per property type: [name, east m, north m, zone key]. */
const POI_LAYOUT: Record<SiteKind, [string, number, number, string?][]> = {
  'Golf Club': [
    ['Clubhouse', 0, 0, 'hosp'],
    ['Pro Shop', 70, -40, 'hosp'],
    ['Hole 1 Tee', 320, 180],
    ['Hole 9 Turn', -480, 420],
    ['Halfway House', -260, -380],
    ['Hole 18 Green', 140, 120],
    ['Lakeside Pavilion', 560, -310],
    ['Charging Bay', -120, 90, 'chg'],
    ['Service Depot', -210, 140, 'svc'],
  ],
  Resort: [
    ['Main Lobby', 0, 0, 'hosp'],
    ['Spa Pavilion', 260, 190],
    ['Villa Cluster A', 520, 340],
    ['Villa Cluster B', -440, 380],
    ['Beach Deck', 360, -460],
    ['Banquet Lawn', -300, -220],
    ['Charging Bay', -110, 120, 'chg'],
    ['Service Depot', -190, 170, 'svc'],
  ],
  'Private Aviation': [
    ['Private Terminal', 0, 0, 'hosp'],
    ['Hangar 1', 420, 120],
    ['Hangar 2', 560, -60],
    ['Apron Gate B', 260, -380],
    ['Crew Lounge', -180, 140, 'hosp'],
    ['Customs Desk', 90, 60, 'hosp'],
    ['Charging Bay', -260, -40, 'chg'],
    ['Service Depot', -330, -120, 'svc'],
  ],
  'Heritage Estate': [
    ['Palace Porch', 0, 0, 'hosp'],
    ['Durbar Hall', 140, 90, 'hosp'],
    ['Garden Court', 360, -220],
    ['Suite Wing', -340, 260],
    ['Stepwell Terrace', -420, -300],
    ['Polo Ground', 620, 260],
    ['Charging Bay', -150, -90, 'chg'],
    ['Service Depot', -230, -150, 'svc'],
  ],
}

const ZONE_DEF: Record<string, { kind: ZoneKind; label: (s: SiteSeed) => string; radius: number; limit: number }> = {
  hosp: { kind: 'Hospitality', label: (s) => (s.kind === 'Private Aviation' ? 'Terminal Forecourt' : s.kind === 'Resort' ? 'Lobby Court' : s.kind === 'Heritage Estate' ? 'Palace Forecourt' : 'Clubhouse Court'), radius: 150, limit: 8 },
  chg: { kind: 'Charging', label: () => 'Charging Bay', radius: 70, limit: 5 },
  svc: { kind: 'Service', label: () => 'Service Depot', radius: 70, limit: 5 },
}

const RESTRICTED: Record<SiteKind, [string, number, number]> = {
  'Golf Club': ['Practice Range', 380, -120],
  Resort: ['Pool Deck', 180, -220],
  'Private Aviation': ['Runway Apron', 520, -360],
  'Heritage Estate': ['Royal Gardens', 300, 320],
}

function build() {
  const sites: Site[] = []
  const geofences: Geofence[] = []

  for (const seed of SITE_SEEDS) {
    const rng = createRng(hash(`site:${seed.id}`))
    const zoneIds: Record<string, string> = {}
    const zonePoints: Record<string, LngLat[]> = {}

    const pois: Poi[] = POI_LAYOUT[seed.kind].map(([name, e, n, zone], i) => {
      const at = offset(seed.center, e + rng.range(-25, 25), n + rng.range(-25, 25))
      if (zone) {
        zoneIds[zone] ??= `${seed.id}-${zone}`
        ;(zonePoints[zone] ??= []).push(at)
      }
      return { id: `${seed.id}-p${i}`, name, at, zoneId: zone ? `${seed.id}-${zone}` : undefined }
    })

    // Property boundary
    const boundary = polygonAround(seed.center, 1050, rng, 12, 0.16)
    geofences.push({ id: `${seed.id}-bnd`, siteId: seed.id, name: `${seed.name} Boundary`, kind: 'Boundary', polygon: boundary, center: seed.center, speedLimit: 20, areaHa: areaHa(1050) })

    for (const [key, pts] of Object.entries(zonePoints)) {
      const def = ZONE_DEF[key]
      const c = centroid(pts)
      geofences.push({ id: zoneIds[key], siteId: seed.id, name: def.label(seed), kind: def.kind, polygon: polygonAround(c, def.radius, rng, 8), center: c, speedLimit: def.limit, areaHa: areaHa(def.radius) })
    }

    const [rName, re, rn] = RESTRICTED[seed.kind]
    const rc = offset(seed.center, re, rn)
    geofences.push({ id: `${seed.id}-rst`, siteId: seed.id, name: rName, kind: 'Restricted', polygon: polygonAround(rc, 120, rng, 7), center: rc, speedLimit: 0, areaHa: areaHa(120) })

    sites.push({ id: seed.id, name: seed.name, city: seed.city, kind: seed.kind, center: seed.center, tariff: seed.tariff, pois })
  }
  return { sites, geofences }
}

function areaHa(radiusM: number) {
  return Math.round(((Math.PI * radiusM * radiusM) / 10_000) * 10) / 10
}

const built = build()
export const SITES = built.sites
export const GEOFENCES = built.geofences
export const SITE_BY_ID = Object.fromEntries(SITES.map((s) => [s.id, s])) as Record<string, Site>
export const MODEL_BY_ID = Object.fromEntries(MODELS.map((m) => [m.id, m])) as Record<string, Model>
export const GEOFENCE_BY_ID = Object.fromEntries(GEOFENCES.map((g) => [g.id, g])) as Record<string, Geofence>
