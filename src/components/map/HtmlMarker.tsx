import { animate } from 'motion/react'
import L from 'leaflet'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LngLat } from '@/lib/geo'
import { useMap } from './MapView'

/**
 * Renders React children as a Leaflet marker via a portal.
 * With `glide`, position updates interpolate smoothly instead of jumping.
 */
export function HtmlMarker({ at, children, anchor = 'center', zIndex, glide = false }: {
  at: LngLat
  children: ReactNode
  anchor?: 'center' | 'bottom'
  zIndex?: number
  glide?: boolean
}) {
  const { map } = useMap()
  const [host] = useState(() => document.createElement('div'))
  const marker = useRef<L.Marker | null>(null)
  const last = useRef<LngLat>(at)
  const zRef = useRef(zIndex)

  useEffect(() => {
    if (!map) return
    const icon = L.divIcon({ html: host, className: 'tl-marker', iconSize: [0, 0], iconAnchor: [0, 0] })
    const m = L.marker([last.current[1], last.current[0]], { icon, keyboard: false, bubblingMouseEvents: false, zIndexOffset: (zRef.current ?? 0) * 1000 }).addTo(map)
    marker.current = m
    return () => {
      m.remove()
      marker.current = null
    }
  }, [map, host])

  const [lng, lat] = at
  useEffect(() => {
    const m = marker.current
    if (!m) return
    const from = last.current
    last.current = [lng, lat]
    if (!glide) {
      m.setLatLng([lat, lng])
      return
    }
    const controls = animate(0, 1, {
      duration: 0.95,
      ease: 'linear',
      onUpdate: (t) => m.setLatLng([from[1] + (lat - from[1]) * t, from[0] + (lng - from[0]) * t]),
    })
    return () => controls.stop()
  }, [lng, lat, glide])

  useEffect(() => {
    zRef.current = zIndex
    marker.current?.setZIndexOffset((zIndex ?? 0) * 1000)
  }, [zIndex])

  return createPortal(<div className={anchor === 'bottom' ? 'tl-anchor-bottom' : 'tl-anchor-center'}>{children}</div>, host)
}
