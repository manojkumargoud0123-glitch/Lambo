import type { Feature, FeatureCollection } from 'geojson'
import type { PathOptions } from 'leaflet'
import type { Geofence, ZoneKind } from '@/data/types'

export const ZONE_COLOR: Record<ZoneKind, string> = {
  Boundary: '#c9a86a',
  Hospitality: '#3987e5',
  Charging: '#199e70',
  Service: '#9a978f',
  Restricted: '#e1362b',
}

export function geofenceCollection(zones: Geofence[], highlight?: string | null): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zones.map((g) => ({
      type: 'Feature',
      id: g.id,
      properties: { id: g.id, kind: g.kind, active: g.id === highlight },
      geometry: { type: 'Polygon', coordinates: [g.polygon] },
    })),
  }
}

export function geofenceStyle(feature?: Feature): PathOptions {
  const kind = feature?.properties?.kind as ZoneKind
  const active = Boolean(feature?.properties?.active)
  const color = ZONE_COLOR[kind] ?? '#c9a86a'
  if (kind === 'Boundary') return { color, weight: active ? 2.2 : 1.4, opacity: 0.85, dashArray: '6 6', fillColor: color, fillOpacity: 0.03 }
  return { color, weight: active ? 2.6 : 1.4, opacity: 0.95, fillColor: color, fillOpacity: active ? 0.34 : 0.16 }
}
