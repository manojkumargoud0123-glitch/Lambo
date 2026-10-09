import { format } from 'date-fns'

const nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
const nf1 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const fmt = {
  int: (n: number) => nf0.format(n),
  one: (n: number) => nf1.format(n),
  two: (n: number) => nf2.format(n),
  compact: (n: number) => compact.format(n),
  inr: (n: number) => inr.format(n),
  pct: (n: number, digits = 0) => `${n.toFixed(digits)}%`,
  signedPct: (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`,
}

/** 125 → "2h 05m", 42 → "42m" */
export function minutesLabel(mins: number) {
  const m = Math.round(mins)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${String(m % 60).padStart(2, '0')}m`
}

/** 3725 seconds → "1:02:05" */
export function clockDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export const dateLabel = (d: Date | number) => format(d, 'dd MMM yyyy')
export const shortDate = (d: Date | number) => format(d, 'dd MMM')
export const timeLabel = (d: Date | number) => format(d, 'HH:mm')
export const dateTimeLabel = (d: Date | number) => format(d, 'dd MMM, HH:mm')

export function relativeMinutes(mins: number) {
  if (mins < 1) return 'just now'
  if (mins < 60) return `${Math.round(mins)} min ago`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
