import { BatteryCharging, ChartSpline, CircleParking, Hexagon, MapPinned, Route, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  index: string
  icon: LucideIcon
  description: string
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Live Map', index: '01', icon: MapPinned, description: 'Every cart, live, across all properties' },
  { to: '/analytics', label: 'Analytics', index: '02', icon: ChartSpline, description: 'Trip intelligence and vehicle snapshots' },
  { to: '/trips', label: 'Trips', index: '03', icon: Route, description: 'Journey-level telemetry' },
  { to: '/charging', label: 'Charging', index: '04', icon: BatteryCharging, description: 'Sessions, energy and cost' },
  { to: '/parking', label: 'Parking', index: '05', icon: CircleParking, description: 'Dwell events and locations' },
  { to: '/geofence', label: 'Geofence', index: '06', icon: Hexagon, description: 'Zones, entries and alerts' },
]
