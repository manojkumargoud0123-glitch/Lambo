import { useSyncExternalStore } from 'react'
import { VEHICLES } from '@/data/fleet'
import type { Vehicle } from '@/data/types'
import { measure, pointAlong } from '@/lib/geo'

/**
 * A tiny external store that simulates live telemetry: moving carts advance
 * along their property loop, charging carts gain SoC, a few carts start/stop.
 * The interval only runs while something is subscribed.
 */
const TICK_MS = 1000
const TIME_WARP = 7 // carts move a little faster than real time so the map feels alive

let state: Vehicle[] = VEHICLES
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()
const cum = new Map<string, number[]>()
for (const v of VEHICLES) cum.set(v.id, measure(v.route))

function tick() {
  const dtH = (TICK_MS / 3_600_000) * TIME_WARP
  state = state.map((v) => {
    const r = Math.random()
    switch (v.status) {
      case 'moving': {
        const lengths = cum.get(v.id)!
        const total = lengths[lengths.length - 1]
        const routeT = v.routeT + (v.speed * dtH) / total
        const { at, heading } = pointAlong(v.route, lengths, routeT)
        const speed = Math.max(7, Math.min(v.model.topSpeed - 1, v.speed + (Math.random() - 0.5) * 3))
        if (r < 0.004) return { ...v, status: 'idle', speed: 0, routeT, position: at, lastSeenMin: 0 }
        return { ...v, routeT, position: at, heading, speed: Math.round(speed), soc: Math.max(5, v.soc - 0.02), lastSeenMin: 0 }
      }
      case 'idle':
        if (r < 0.03) return { ...v, status: 'moving', speed: 10 }
        return v
      case 'charging': {
        const soc = Math.min(100, v.soc + 0.08)
        return soc >= 100 ? { ...v, soc: 100, status: 'parked' } : { ...v, soc }
      }
      default:
        return v
    }
  })
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) timer = setInterval(tick, TICK_MS)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

export function useLiveFleet() {
  return useSyncExternalStore(subscribe, () => state)
}
