import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { isoDay } from '@/data/analytics'

/**
 * Day-grouped timeline with progressive reveal. Rows animate in with a CSS keyframe
 * (no JS animation per row), so long lists stay smooth.
 */
export function Feed<T>({
  items,
  date,
  rowKey,
  renderRow,
  daySummary,
  noun,
  pageSize = 24,
  empty = 'Nothing recorded for these filters.',
}: {
  items: T[]
  date: (item: T) => Date
  rowKey: (item: T) => string
  renderRow: (item: T) => ReactNode
  daySummary?: (items: T[]) => ReactNode
  noun: string
  pageSize?: number
  empty?: string
}) {
  const [shown, setShown] = useState(pageSize)
  const [prevItems, setPrevItems] = useState(items)
  if (prevItems !== items) {
    setPrevItems(items)
    setShown(pageSize)
  }

  const groups = useMemo(() => {
    const out: { key: string; date: Date; rows: T[]; all: T[] }[] = []
    const byDay = new Map<string, T[]>()
    for (const it of items) {
      const k = isoDay(date(it))
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(it)
    }
    let budget = shown
    for (const [key, all] of byDay) {
      if (budget <= 0) break
      out.push({ key, date: date(all[0]), rows: all.slice(0, budget), all })
      budget -= all.length
    }
    return out
  }, [items, shown, date])

  if (!items.length) return <p className="py-20 text-center text-sm text-muted">{empty}</p>

  const remaining = Math.max(0, items.length - shown)
  let i = 0

  return (
    <div>
      {groups.map((g) => (
        <Fragment key={g.key}>
          <div className="sticky top-[88px] z-10 -mx-1 mb-2 mt-8 flex items-center justify-between gap-4 px-1 py-2 first:mt-0">
            <span className="glass flex items-center gap-3 rounded-full px-4 py-1.5">
              <span className="font-wide text-[10px] font-medium uppercase tracking-[0.16em] text-ink">{format(g.date, 'EEEE')}</span>
              <span className="text-[12px] text-muted">{format(g.date, 'dd MMM yyyy')}</span>
            </span>
            <span className="text-[12px] text-muted">
              {g.all.length.toLocaleString('en-IN')} {noun}
              {daySummary && <> · {daySummary(g.all)}</>}
            </span>
          </div>
          <ul className="space-y-1">
            {g.rows.map((row) => {
              const delay = Math.min(i++, 12) * 30
              return (
                <li key={rowKey(row)} className="rise" style={{ animationDelay: `${delay}ms` }}>
                  {renderRow(row)}
                </li>
              )
            })}
          </ul>
        </Fragment>
      ))}
      {remaining > 0 && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => setShown((s) => s + pageSize * 2)}>
            Show more <span className="text-muted">· {remaining.toLocaleString('en-IN')} remaining</span>
            <ChevronDown className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

/** Shared row chrome for feeds. */
export function FeedRow({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={
        'group grid w-full items-center gap-x-6 gap-y-3 rounded-3xl border border-transparent px-4 py-4 text-left transition-colors duration-300 hover:border-line hover:bg-surface-2/60 sm:px-5 ' +
        (className ?? '')
      }
    >
      {children}
    </Tag>
  )
}
