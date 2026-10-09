import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/format'
import { AnimatedNumber } from './AnimatedNumber'
import { Sparkline } from './Sparkline'

/** Figures set like a car spec sheet: hairline dividers, no boxes. */
export function SpecStrip({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 border-t border-line lg:grid-cols-4', className)}>{children}</div>
}

export function Spec({
  label,
  value,
  format,
  unit,
  delta,
  upIsGood = true,
  trend,
  note,
}: {
  label: string
  value: number
  format?: (n: number) => string
  unit?: string
  delta?: number
  upIsGood?: boolean
  trend?: number[]
  note?: ReactNode
}) {
  const good = delta === undefined || delta === 0 ? null : delta > 0 === upIsGood
  return (
    <div className="border-b border-line py-6 pr-4 odd:pr-6 lg:border-b-0 lg:border-l lg:px-8 lg:first:border-l-0 lg:first:pl-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-4 flex items-baseline gap-2 whitespace-nowrap">
        <AnimatedNumber value={value} format={format} className="text-[clamp(2.1rem,3.4vw,3.3rem)] font-extralight leading-none tracking-tight text-ink" />
        {unit && <span className="text-[13px] text-muted">{unit}</span>}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        {delta !== undefined ? (
          <p className="flex items-center gap-1.5 text-[12px]">
            <span className={cn('inline-flex items-center gap-0.5', good === null ? 'text-muted' : good ? 'text-good' : 'text-bad')}>
              {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {fmt.signedPct(delta)}
            </span>
            <span className="text-muted">vs previous</span>
          </p>
        ) : (
          <p className="text-[12px] text-muted">{note}</p>
        )}
        {trend && <Sparkline values={trend} width={84} height={26} className="shrink-0 opacity-90" />}
      </div>
    </div>
  )
}
