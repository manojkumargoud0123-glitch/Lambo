import { memo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const axisTick = { fill: 'var(--muted)', fontSize: 11, fontFamily: 'Kanit' }

/** Columns ≤ 24px, 4px rounded data-end, square at the baseline. Optional per-bar colours for ordinal ramps. */
function ColumnChartImpl<T extends { label: string }>({ data, dataKey, unit, colors, height = 240, format }: {
  data: T[]
  dataKey: keyof T & string
  unit?: string
  colors?: string[]
  height?: number
  format?: (n: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: -18 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval="preserveStartEnd" minTickGap={10} dy={8} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={(p) => <ChartTooltip {...p} unit={unit} format={format} />} />
        <Bar dataKey={String(dataKey)} maxBarSize={24} radius={[4, 4, 0, 0]} fill="var(--gold)" animationDuration={1100} animationEasing="ease-out">
          {colors && data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export const ColumnChart = memo(ColumnChartImpl) as typeof ColumnChartImpl
