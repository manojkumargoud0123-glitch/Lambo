import { memo, useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const axisTick = { fill: 'var(--muted)', fontSize: 11, fontFamily: 'Kanit' }

/** Single-series area: 2px line, 10% wash, crosshair + tooltip on hover. */
function TrendChartImpl<T extends { label: string }>({ data, dataKey, unit, format, height = 280 }: {
  data: T[]
  dataKey: keyof T & string
  unit?: string
  format?: (n: number) => string
  height?: number
}) {
  const id = useId().replace(/:/g, '')
  const tick = format ?? ((n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} minTickGap={24} dy={8} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={tick} width={52} />
        <Tooltip
          cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
          content={(p) => <ChartTooltip {...p} unit={unit} format={format ?? ((n) => n.toLocaleString('en-IN', { maximumFractionDigits: 1 }))} />}
        />
        <Area
          type="monotone"
          dataKey={String(dataKey)}
          stroke="var(--gold)"
          strokeWidth={2}
          fill={`url(#g-${id})`}
          activeDot={{ r: 5, fill: 'var(--gold)', stroke: 'var(--surface)', strokeWidth: 2 }}
          animationDuration={1400}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Memoised: only re-renders when its data or metric changes. */
export const TrendChart = memo(TrendChartImpl) as typeof TrendChartImpl
