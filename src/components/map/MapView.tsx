import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { LngLat } from '@/lib/geo'
import { BASEMAPS, GOOGLE_ATTRIBUTION, GOOGLE_SUBDOMAINS, type Basemap } from './basemaps'

export type { Basemap }

const Ctx = createContext<{ map: L.Map | null }>({ map: null })
// eslint-disable-next-line react-refresh/only-export-components
export const useMap = () => useContext(Ctx)

/** Our coordinates are [lng, lat]; Leaflet wants [lat, lng]. */
// eslint-disable-next-line react-refresh/only-export-components
export const ll = ([lng, lat]: LngLat): L.LatLngTuple => [lat, lng]
// eslint-disable-next-line react-refresh/only-export-components
export const llBounds = ([sw, ne]: [LngLat, LngLat]) => L.latLngBounds(ll(sw), ll(ne))

export function MapView({
  bounds,
  center,
  zoom = 5,
  basemap = 'satellite',
  padding = 40,
  className,
  children,
  onReady,
}: {
  bounds?: [LngLat, LngLat]
  center?: LngLat
  zoom?: number
  basemap?: Basemap
  padding?: number
  className?: string
  children?: ReactNode
  onReady?: (map: L.Map) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<L.Map | null>(null)
  const initial = useRef({ bounds, center, zoom, padding, onReady })

  useEffect(() => {
    const init = initial.current
    const m = L.map(container.current!, {
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      minZoom: 3,
      maxZoom: 21,
      worldCopyJump: true,
    })
    m.attributionControl.setPrefix(false)
    if (init.bounds) m.fitBounds(llBounds(init.bounds), { padding: [init.padding, init.padding] })
    else m.setView(ll(init.center ?? [78.9, 21.5]), init.zoom)
    setMap(m)
    init.onReady?.(m)
    const ro = new ResizeObserver(() => m.invalidateSize({ pan: false }))
    ro.observe(container.current!)
    return () => {
      ro.disconnect()
      m.remove()
      setMap(null)
    }
  }, [])

  // Basemap tiles
  useEffect(() => {
    if (!map) return
    const spec = BASEMAPS[basemap]
    const layer = L.tileLayer(spec.url, {
      subdomains: GOOGLE_SUBDOMAINS,
      maxNativeZoom: spec.maxNativeZoom,
      maxZoom: 21,
      attribution: GOOGLE_ATTRIBUTION,
      className: 'tl-tiles',
    }).addTo(map)
    return () => {
      layer.remove()
    }
  }, [map, basemap])

  return (
    <div className={cn('tl-map relative overflow-hidden', className)}>
      <div ref={container} className="absolute inset-0 z-0" />
      <Ctx.Provider value={{ map }}>{map && children}</Ctx.Provider>
    </div>
  )
}

/** Fly so that `at` lands `offset` pixels away from the viewport centre. */
// eslint-disable-next-line react-refresh/only-export-components
export function flyWithOffset(map: L.Map, at: LngLat, zoom: number, offset: [number, number] = [0, 0], duration = 2) {
  const target = map.project(ll(at), zoom).subtract(L.point(offset))
  map.flyTo(map.unproject(target, zoom), zoom, { duration, easeLinearity: 0.2 })
}
