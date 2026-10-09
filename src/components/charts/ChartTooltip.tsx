import type { TooltipContentProps } from 'recharts'

/** Glass tooltip shared by every chart: label on top, value in primary ink, swatch for identity. */
export function ChartTooltip({ active, payload, label, unit, format, title }: Partial<TooltipContentProps> & {
  unit?: string
  format?: (n: number) => string
  title?: (label: string | number | undefined) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass min-w-[150px] rounded-2xl px-4 py-3">
      <p className="eyebrow mb-2 text-[8.5px]">{title ? title(label) : label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-[13px]">
          <span className="h-0.5 w-3 rounded-full" style={{ background: 'var(--gold)' }} />
          <span className="text-ink">
            {format ? format(Number(p.value)) : Number(p.value).toLocaleString('en-IN')}
            {unit && <span className="ml-1 text-muted">{unit}</span>}
          </span>
        </p>
      ))}
    </div>
  )
}
