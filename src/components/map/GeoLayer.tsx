import type { Feature, FeatureCollection } from 'geojson'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from './MapView'

/** A GeoJSON overlay; restyles in place when data or style change. */
export function GeoLayer({ data, style, onFeatureClick }: {
  data: FeatureCollection
  style: (feature?: Feature) => L.PathOptions
  onFeatureClick?: (feature: Feature) => void
}) {
  const { map } = useMap()
  const layer = useRef<L.GeoJSON | null>(null)
  const styleRef = useRef(style)
  const clickRef = useRef(onFeatureClick)

  useEffect(() => {
    styleRef.current = style
    clickRef.current = onFeatureClick
  })

  useEffect(() => {
    if (!map) return
    const g = L.geoJSON(undefined, {
      style: (f) => styleRef.current(f),
      interactive: Boolean(clickRef.current),
      onEachFeature: (f, l) => l.on('click', () => clickRef.current?.(f)),
    }).addTo(map)
    layer.current = g
    return () => {
      g.remove()
      layer.current = null
    }
  }, [map])

  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    g.addData(data)
    g.setStyle((f) => styleRef.current(f))
  }, [data, map])

  return null
}
