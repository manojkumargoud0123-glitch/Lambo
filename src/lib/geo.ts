import type { Rng } from './random'

export type LngLat = [number, number]

const M_PER_DEG = 111_320

/** Move a point by metres east / north. */
export function offset([lng, lat]: LngLat, east: number, north: number): LngLat {
  return [lng + east / (M_PER_DEG * Math.cos((lat * Math.PI) / 180)), lat + north / M_PER_DEG]
}

export function distanceKm(a: LngLat, b: LngLat) {
  const R = 6371
  const dLat = ((b[1] - a[1]) * Math.PI) / 180
  const dLng = ((b[0] - a[0]) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function bearing(a: LngLat, b: LngLat) {
  const φ1 = (a[1] * Math.PI) / 180
  const φ2 = (b[1] * Math.PI) / 180
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

/** An irregular polygon (closed ring) around a centre — used for geofences. */
export function polygonAround(center: LngLat, radius: number, rng: Rng, sides = 9, jitter = 0.28): LngLat[] {
  const start = rng.range(0, Math.PI * 2)
  const ring: LngLat[] = []
  for (let i = 0; i < sides; i++) {
    const a = start + (i / sides) * Math.PI * 2
    const r = radius * (1 - jitter / 2 + rng.next() * jitter)
    ring.push(offset(center, Math.cos(a) * r, Math.sin(a) * r))
  }
  ring.push(ring[0])
  return ring
}

/** A smooth closed loop — the circuit a cart drives around its property. */
export function loopAround(center: LngLat, rx: number, ry: number, rng: Rng, points = 48): LngLat[] {
  const phase = rng.range(0, Math.PI * 2)
  const rot = rng.range(0, Math.PI)
  const w1 = rng.range(0.08, 0.18)
  const w2 = rng.range(0.04, 0.1)
  const ring: LngLat[] = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const wobble = 1 + w1 * Math.sin(3 * a + phase) + w2 * Math.cos(5 * a - phase)
    const x = Math.cos(a) * rx * wobble
    const y = Math.sin(a) * ry * wobble
    ring.push(offset(center, x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)))
  }
  ring.push(ring[0])
  return ring
}

/** Pre-computed cumulative lengths so a position at fraction t can be found quickly. */
export function measure(route: LngLat[]) {
  const cum = [0]
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + distanceKm(route[i - 1], route[i]))
  return cum
}

export function pointAlong(route: LngLat[], cum: number[], t: number): { at: LngLat; heading: number } {
  const total = cum[cum.length - 1]
  const target = (((t % 1) + 1) % 1) * total
  let i = 1
  while (i < cum.length - 1 && cum[i] < target) i++
  const seg = cum[i] - cum[i - 1] || 1
  const f = (target - cum[i - 1]) / seg
  const a = route[i - 1]
  const b = route[i]
  return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], heading: bearing(a, b) }
}

/** A short wandering path between two points, for trip route previews. */
export function pathBetween(a: LngLat, b: LngLat, rng: Rng, steps = 14): LngLat[] {
  const km = distanceKm(a, b)
  const bulge = Math.max(60, km * 1000 * 0.35) * (rng.chance(0.5) ? 1 : -1)
  const out: LngLat[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const base: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    const lift = Math.sin(Math.PI * t) * bulge + (i > 0 && i < steps ? rng.range(-25, 25) : 0)
    const ang = (bearing(a, b) * Math.PI) / 180
    out.push(offset(base, Math.cos(ang) * lift, -Math.sin(ang) * lift))
  }
  return out
}

export function boundsOf(points: LngLat[]): [LngLat, LngLat] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ]
}

/** Ray-casting point-in-polygon test. */
export function inside([x, y]: LngLat, ring: LngLat[]) {
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

export function centroid(points: LngLat[]): LngLat {
  const ring = points.length > 1 && points[0] === points[points.length - 1] ? points.slice(0, -1) : points
  const s = ring.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
  return [s[0] / ring.length, s[1] / ring.length]
}
