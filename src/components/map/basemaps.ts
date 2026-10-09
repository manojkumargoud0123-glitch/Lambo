/**
 * Google map layers for Leaflet. Tiles are shown exactly as Google renders them, in both app themes.
 * These are Google's public tile endpoints. For a production deployment, Google's terms
 * require Google Maps Platform (Map Tiles API + API key) — swap the URLs here when ready.
 */
export type Basemap = 'road' | 'satellite' | 'hybrid' | 'terrain'

const google = (lyrs: string) => `https://{s}.google.com/vt/lyrs=${lyrs}&hl=en&x={x}&y={y}&z={z}`

export const BASEMAPS: Record<Basemap, { label: string; url: string; maxNativeZoom: number }> = {
  road: { label: 'Road', url: google('m'), maxNativeZoom: 20 },
  satellite: { label: 'Satellite', url: google('s'), maxNativeZoom: 20 },
  hybrid: { label: 'Hybrid', url: google('y'), maxNativeZoom: 20 },
  terrain: { label: 'Terrain', url: google('p'), maxNativeZoom: 20 },
}

export const GOOGLE_SUBDOMAINS = ['mt0', 'mt1', 'mt2', 'mt3']
export const GOOGLE_ATTRIBUTION = 'Map data &copy; Google'
