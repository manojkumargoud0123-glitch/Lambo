import type { LngLat } from '@/lib/geo'

export type { LngLat }

export type VehicleStatus = 'moving' | 'idle' | 'charging' | 'parked' | 'offline'

export type SiteKind = 'Golf Club' | 'Resort' | 'Private Aviation' | 'Heritage Estate'

export type ZoneKind = 'Boundary' | 'Hospitality' | 'Charging' | 'Service' | 'Restricted'

export interface Poi {
  id: string
  name: string
  at: LngLat
  zoneId?: string
}

export interface Site {
  id: string
  name: string
  city: string
  kind: SiteKind
  center: LngLat
  tariff: number // ₹ per kWh
  pois: Poi[]
}

export interface Geofence {
  id: string
  siteId: string
  name: string
  kind: ZoneKind
  polygon: LngLat[]
  center: LngLat
  speedLimit: number
  areaHa: number
}

export interface Model {
  id: string
  name: string
  short: string
  seats: number
  batteryKwh: number
  rangeKm: number
  topSpeed: number
  efficiency: number // km per kWh
}

export interface Vehicle {
  id: string
  code: string
  model: Model
  siteId: string
  driver: string | null
  status: VehicleStatus
  soc: number
  speed: number
  heading: number
  position: LngLat
  odometer: number
  batteryHealth: number
  batteryTemp: number
  lastSeenMin: number
  /** The loop this cart circulates on while moving (live simulation). */
  route: LngLat[]
  routeT: number
  commissioned: Date
}

export interface Trip {
  id: string
  vehicleId: string
  code: string
  siteId: string
  driver: string
  start: Date
  end: Date
  from: string
  to: string
  fromAt: LngLat
  toAt: LngLat
  distanceKm: number
  durationMin: number
  idleMin: number
  avgSpeed: number
  maxSpeed: number
  startSoc: number
  endSoc: number
  energyKwh: number
  efficiency: number
}

export interface ChargeSession {
  id: string
  vehicleId: string
  code: string
  siteId: string
  charger: string
  type: 'Standard' | 'Fast'
  start: Date
  end: Date
  durationMin: number
  startSoc: number
  endSoc: number
  energyKwh: number
  cost: number
}

export interface ParkingEvent {
  id: string
  vehicleId: string
  code: string
  siteId: string
  location: string
  at: LngLat
  start: Date
  end: Date
  durationMin: number
  inZone: boolean
  soc: number
}

export interface GeofenceEvent {
  id: string
  geofenceId: string
  zone: string
  kind: ZoneKind
  vehicleId: string
  code: string
  siteId: string
  /** Same instant as `entry`; lets events share the period filters. */
  start: Date
  entry: Date
  exit: Date
  dwellMin: number
  alert: 'Restricted entry' | 'Overspeed' | null
}
