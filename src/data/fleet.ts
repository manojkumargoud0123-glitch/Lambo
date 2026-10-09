import { addDays, startOfDay } from 'date-fns'
import { distanceKm, loopAround, offset, type LngLat } from '@/lib/geo'
import { createRng, hash, type Rng } from '@/lib/random'
import { GEOFENCES, MODEL_BY_ID, SITE_BY_ID, SITE_SEEDS } from './catalog'
import type { ChargeSession, GeofenceEvent, ParkingEvent, Poi, Site, Trip, Vehicle, VehicleStatus } from './types'

export const NOW = new Date()
export const TODAY = startOfDay(NOW)
export const HISTORY_DAYS = 30
export const HISTORY_START = addDays(TODAY, -(HISTORY_DAYS - 1))

const FIRST = ['Aarav', 'Ishaan', 'Kabir', 'Vihaan', 'Arjun', 'Rohan', 'Siddharth', 'Aditya', 'Dev', 'Karan', 'Ananya', 'Meera', 'Kavya', 'Tara', 'Riya', 'Nikhil', 'Pranav', 'Yash', 'Zoya', 'Imran', 'Farhan', 'Neha', 'Pooja', 'Sana', 'Rahul', 'Vikram', 'Manav', 'Aryan', 'Tanvi', 'Ira', 'Gaurav', 'Harsh', 'Lakshya', 'Omkar', 'Sameer', 'Varun', 'Jatin', 'Deepak', 'Suresh', 'Anil']
const LAST = ['Mehta', 'Rao', 'Sethi', 'Kapoor', 'Nair', 'Iyer', 'Jain', 'Menon', 'Malhotra', 'Bhatia', 'Desai', 'Pillai', 'Reddy', 'Joshi', 'Bose', 'Shetty', 'Kulkarni', 'Thakur', 'Khan', 'Sheikh', 'Gupta', 'Verma', 'Chauhan', 'Rathore', 'Ahuja', 'Saxena', 'Patil', 'Banerjee', 'Singh', 'Naidu']

const STATUS_WEIGHTS: [VehicleStatus, number][] = [
  ['moving', 0.4],
  ['idle', 0.1],
  ['charging', 0.14],
  ['parked', 0.27],
  ['offline', 0.09],
]

function weighted<T extends string>(rng: Rng, weights: [T, number][]): T {
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let r = rng.next() * total
  for (const [k, w] of weights) {
    if ((r -= w) <= 0) return k
  }
  return weights[weights.length - 1][0]
}

const near = (rng: Rng, at: LngLat, m = 18) => offset(at, rng.range(-m, m), rng.range(-m, m))
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

// ── Generation ──────────────────────────────────────────────
interface Built {
  vehicles: Vehicle[]
  trips: Trip[]
  charges: ChargeSession[]
  parking: ParkingEvent[]
  geofenceEvents: GeofenceEvent[]
}

function generate(): Built {
  const vehicles: Vehicle[] = []
  const trips: Trip[] = []
  const charges: ChargeSession[] = []
  const parking: ParkingEvent[] = []
  const usedSerials = new Set<number>()

  for (const seed of SITE_SEEDS) {
    const site = SITE_BY_ID[seed.id]
    const chargeBay = site.pois.find((p) => p.name === 'Charging Bay')!
    const destinations = site.pois.filter((p) => p.name !== 'Service Depot' && p.name !== 'Charging Bay')

    for (let i = 0; i < seed.fleet; i++) {
      const rng = createRng(hash(`veh:${seed.id}:${i}`))
      const model = MODEL_BY_ID[weighted(rng, Object.entries(seed.mix) as [string, number][])]
      let serial = rng.int(1000, 9899)
      while (usedSerials.has(serial)) serial++
      usedSerials.add(serial)

      const id = `${seed.id}-${i}`
      const code = `TL-${model.id.toUpperCase()}-${serial}`
      const driver = rng.chance(0.9) ? `${rng.pick(FIRST)} ${rng.pick(LAST)}` : null
      const ageDays = rng.int(90, 620)
      let odometer = round(ageDays * rng.range(16, 34), 1)

      // ── 30 days of operation ──
      for (let d = HISTORY_DAYS - 1; d >= 0; d--) {
        const dayStart = addDays(TODAY, -d)
        const dayRng = createRng(hash(`${id}:${d}`))
        if (dayRng.chance(0.05)) continue // maintenance / rest day
        const result = simulateDay({ id, code, model, driver: driver ?? `${dayRng.pick(FIRST)} ${dayRng.pick(LAST)}` }, site, dayStart, dayRng, chargeBay, destinations, 29 - d, d === 0 ? NOW.getTime() : undefined)
        trips.push(...result.trips)
        charges.push(...result.charges)
        parking.push(...result.parking)
        odometer += result.trips.reduce((s, t) => s + t.distanceKm, 0)
      }

      // ── Live state ──
      const status = weighted(rng, STATUS_WEIGHTS)
      const route = loopAround(offset(site.center, rng.range(-260, 260), rng.range(-220, 220)), rng.range(320, 680), rng.range(240, 520), rng)
      const poi = rng.pick(destinations)
      const position: LngLat =
        status === 'charging' ? near(rng, chargeBay.at, 14) : status === 'moving' || status === 'idle' ? route[rng.int(0, route.length - 2)] : near(rng, poi.at)
      const soc =
        status === 'charging' ? rng.int(18, 84) : status === 'offline' ? rng.int(8, 64) : status === 'parked' ? rng.int(38, 100) : rng.int(26, 96)

      vehicles.push({
        id,
        code,
        model,
        siteId: seed.id,
        driver: status === 'offline' ? null : driver,
        status,
        soc,
        speed: status === 'moving' ? round(rng.range(9, 22), 0) : 0,
        heading: rng.range(0, 360),
        position,
        odometer: round(odometer, 1),
        batteryHealth: rng.int(91, 100),
        batteryTemp: rng.int(29, status === 'charging' ? 41 : 36),
        lastSeenMin: status === 'offline' ? rng.int(45, 1800) : rng.range(0, 1.5),
        route,
        routeT: rng.next(),
        commissioned: addDays(TODAY, -ageDays),
      })
    }
  }

  trips.sort((a, b) => b.start.getTime() - a.start.getTime())
  charges.sort((a, b) => b.start.getTime() - a.start.getTime())
  parking.sort((a, b) => b.start.getTime() - a.start.getTime())

  return { vehicles, trips, charges, parking, geofenceEvents: deriveGeofenceEvents(trips, charges, parking) }
}

interface VehicleRef {
  id: string
  code: string
  model: Vehicle['model']
  driver: string
}

function simulateDay(v: VehicleRef, site: Site, dayStart: Date, rng: Rng, chargeBay: Poi, destinations: Poi[], recency: number, until?: number) {
  const trips: Trip[] = []
  const charges: ChargeSession[] = []
  const parking: ParkingEvent[] = []
  const minute = 60_000
  const day0 = dayStart.getTime()
  const weekend = dayStart.getDay() === 0 || dayStart.getDay() === 6
  const aviation = site.kind === 'Private Aviation'
  const busy = (weekend && !aviation ? 0.72 : 1) * (1 - recency * 0.004) // shorter parks → more trips
  const close = day0 + (aviation ? 23 : 21.5) * 60 * minute

  let t = day0 + (aviation ? rng.range(5, 7.5) : rng.range(6, 7.6)) * 60 * minute
  let soc = rng.range(86, 100)
  let loc: Poi = chargeBay
  let n = 0

  const stamp = (kind: string) => `${v.id}-${dayStart.getDate()}${dayStart.getMonth()}-${kind}${n++}`

  const charge = (startAt: number, target: number, overnight = false) => {
    const fast = !overnight && rng.chance(0.62)
    const power = fast ? 3.3 : 1.6
    const kwhBattery = ((target - soc) / 100) * v.model.batteryKwh
    const grid = kwhBattery / 0.92
    const dur = (grid / power) * 60 * rng.range(0.95, 1.12)
    const startSoc = Math.round(soc)
    charges.push({
      id: stamp('c'),
      vehicleId: v.id,
      code: v.code,
      siteId: site.id,
      charger: `Bay ${rng.chance(0.5) ? 'A' : 'B'} · C${rng.int(1, 4)}`,
      type: fast ? 'Fast' : 'Standard',
      start: new Date(startAt),
      end: new Date(startAt + dur * minute),
      durationMin: round(dur, 1),
      startSoc,
      endSoc: Math.round(target),
      energyKwh: round(grid),
      cost: round(grid * site.tariff, 0),
    })
    soc = target
    return dur
  }

  while (t < close) {
    if (soc < 32) {
      t += charge(t, rng.range(86, 100)) * minute
      loc = chargeBay
      continue
    }

    // Trip
    let to = rng.pick(destinations)
    if (to.id === loc.id) to = destinations[(destinations.indexOf(to) + 1) % destinations.length]
    const direct = distanceKm(loc.at, to.at)
    const round9 = site.kind === 'Golf Club' && rng.chance(0.22) ? rng.range(2.4, 5.2) : 0
    const distance = Math.max(0.35, direct * rng.range(1.35, 2.4) + round9)
    const avgSpeed = rng.range(9, 17.5)
    const moving = (distance / avgSpeed) * 60
    const idle = rng.range(0, moving * 0.22)
    const efficiency = v.model.efficiency * rng.range(0.84, 1.12)
    const energy = distance / efficiency
    const drop = (energy / v.model.batteryKwh) * 100
    const end = t + (moving + idle) * minute
    if (until && end > until) break

    trips.push({
      id: stamp('t'),
      vehicleId: v.id,
      code: v.code,
      siteId: site.id,
      driver: v.driver,
      start: new Date(t),
      end: new Date(end),
      from: loc.name,
      to: to.name,
      fromAt: loc.at,
      toAt: to.at,
      distanceKm: round(distance),
      durationMin: round(moving + idle, 1),
      idleMin: round(idle, 1),
      avgSpeed: round(avgSpeed, 1),
      maxSpeed: Math.min(v.model.topSpeed, Math.round(avgSpeed + rng.range(4, 10))),
      startSoc: Math.round(soc),
      endSoc: Math.round(soc - drop),
      energyKwh: round(energy),
      efficiency: round(efficiency, 1),
    })
    t = end
    soc -= drop
    loc = to

    // Park
    const long = rng.chance(0.12)
    const dwell = (long ? rng.range(70, 160) : rng.range(8, 95)) * busy
    const parkEnd = t + dwell * minute
    if (until && parkEnd > until) break
    parking.push({
      id: stamp('p'),
      vehicleId: v.id,
      code: v.code,
      siteId: site.id,
      location: loc.name,
      at: loc.at,
      start: new Date(t),
      end: new Date(parkEnd),
      durationMin: round(dwell, 1),
      inZone: Boolean(loc.zoneId),
      soc: Math.round(soc),
    })
    t = parkEnd
  }

  if (!until && soc < 78) charge(Math.min(t, close) + rng.range(5, 25) * minute, rng.range(95, 100), true)

  return { trips, charges, parking }
}

function deriveGeofenceEvents(trips: Trip[], charges: ChargeSession[], parking: ParkingEvent[]): GeofenceEvent[] {
  const events: GeofenceEvent[] = []
  const zoneByPoi = new Map<string, string>()
  for (const s of Object.values(SITE_BY_ID)) for (const p of s.pois) if (p.zoneId) zoneByPoi.set(`${s.id}:${p.name}`, p.zoneId)
  const byId = Object.fromEntries(GEOFENCES.map((g) => [g.id, g]))
  const minute = 60_000

  const push = (zoneId: string, vehicleId: string, code: string, siteId: string, entry: number, exit: number, alert: GeofenceEvent['alert']) => {
    const g = byId[zoneId]
    if (!g) return
    events.push({
      id: `${vehicleId}-${entry}-${zoneId}`,
      geofenceId: zoneId,
      zone: g.name,
      kind: g.kind,
      vehicleId,
      code,
      siteId,
      start: new Date(entry),
      entry: new Date(entry),
      exit: new Date(exit),
      dwellMin: round((exit - entry) / minute, 1),
      alert,
    })
  }

  for (const p of parking) {
    const zone = zoneByPoi.get(`${p.siteId}:${p.location}`)
    if (!zone) continue
    const r = createRng(hash(p.id))
    push(zone, p.vehicleId, p.code, p.siteId, p.start.getTime() - r.range(0.5, 2.5) * minute, p.end.getTime() + r.range(0.5, 2) * minute, r.chance(0.012) ? 'Overspeed' : null)
  }
  for (const c of charges) {
    push(`${c.siteId}-chg`, c.vehicleId, c.code, c.siteId, c.start.getTime() - 1.5 * minute, c.end.getTime() + 2 * minute, null)
  }
  for (const t of trips) {
    const r = createRng(hash(`rst:${t.id}`))
    if (!r.chance(0.014)) continue
    const at = t.start.getTime() + r.range(0.2, 0.7) * (t.end.getTime() - t.start.getTime())
    push(`${t.siteId}-rst`, t.vehicleId, t.code, t.siteId, at, at + r.range(0.6, 5.5) * minute, 'Restricted entry')
  }

  return events.sort((a, b) => b.entry.getTime() - a.entry.getTime())
}

const built = generate()

export const VEHICLES = built.vehicles
export const TRIPS = built.trips
export const CHARGES = built.charges
export const PARKING = built.parking
export const GEOFENCE_EVENTS = built.geofenceEvents
export const VEHICLE_BY_ID = Object.fromEntries(VEHICLES.map((v) => [v.id, v])) as Record<string, Vehicle>
