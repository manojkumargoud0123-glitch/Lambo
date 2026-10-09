import { format } from 'date-fns'
import { memo, useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const axisTick = { fill: 'var(--muted)', fontSize: 11, fontFamily: 'Kanit' }

/** State of charge across one day on a true time axis. */
function SocCurveImpl({ points, from, to, height = 260 }: { points: { t: number; soc: number }[]; from: number; to: number; height?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 12, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={`soc-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="t"
          type="number"
          domain={[from, to]}
          scale="time"
          tickFormatter={(t: number) => format(t, 'HH:mm')}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: 'var(--axis)' }}
          tickCount={8}
          dy={8}
        />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} width={48} />
        <Tooltip
          cursor={{ stroke: 'var(--line-strong)' }}
          content={(p) => <ChartTooltip {...p} unit="%" format={(n) => Math.round(n).toString()} title={(l) => format(Number(l), 'HH:mm')} />}
        />
        <Area type="linear" dataKey="soc" stroke="var(--gold)" strokeWidth={2} fill={`url(#soc-${id})`} dot={false} activeDot={{ r: 5, fill: 'var(--gold)', stroke: 'var(--surface)', strokeWidth: 2 }} animationDuration={1600} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const SocCurve = memo(SocCurveImpl)
