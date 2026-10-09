import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Inbox } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/cn'

export interface ColumnMeta {
  align?: 'left' | 'right' | 'center'
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Columns<T> = ColumnDef<T, any>[]

const PAGE_SIZES = ['10', '25', '50', '100']

export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  initialSort = [],
  toolbar,
  actions,
  emptyMessage = 'No records match these filters.',
}: {
  data: T[]
  columns: Columns<T>
  getRowId: (row: T) => string
  onRowClick?: (row: T) => void
  initialSort?: SortingState
  toolbar?: ReactNode
  actions?: ReactNode
  emptyMessage?: string
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSort)
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [colsOpen, setColsOpen] = useState(false)
  const colsRef = useRef<HTMLDivElement>(null)

  // Reset to the first page whenever the filtered data changes.
  const [prevData, setPrevData] = useState(data)
  if (prevData !== data) {
    setPrevData(data)
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  useEffect(() => {
    if (!colsOpen) return
    const onDown = (e: PointerEvent) => !colsRef.current?.contains(e.target as Node) && setColsOpen(false)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [colsOpen])

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: visibility, pagination },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onPaginationChange: setPagination,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const total = data.length
  const { pageIndex, pageSize } = pagination
  const first = total ? pageIndex * pageSize + 1 : 0
  const last = Math.min(total, (pageIndex + 1) * pageSize)
  const pageCount = table.getPageCount()
  const rows = table.getRowModel().rows

  return (
    <div className="card overflow-hidden rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">{toolbar}</div>
        <div className="flex items-center gap-2">
          <div ref={colsRef} className="relative">
            <Button size="sm" variant="ghost" onClick={() => setColsOpen((o) => !o)} aria-expanded={colsOpen}>
              <Columns3 className="size-3.5" />
              Columns
            </Button>
            <AnimatePresence>
              {colsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="glass absolute right-0 z-40 mt-2 w-56 rounded-2xl p-2"
                >
                  {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[13px] text-ink-2 hover:bg-surface-3">
                      <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} className="accent-[var(--gold)]" />
                      {typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id}
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {actions}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-line">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta as ColumnMeta | undefined
                  const sorted = h.column.getIsSorted()
                  const canSort = h.column.getCanSort()
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      className={cn('whitespace-nowrap px-5 py-3.5 font-normal', meta?.align === 'right' ? 'text-right' : meta?.align === 'center' ? 'text-center' : 'text-left')}
                    >
                      {h.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn('eyebrow inline-flex items-center gap-1.5 transition-colors hover:text-ink', sorted && 'text-ink', meta?.align === 'right' && 'flex-row-reverse')}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' ? <ArrowUp className="size-3 text-gold" /> : sorted === 'desc' ? <ArrowDown className="size-3 text-gold" /> : <ArrowUpDown className="size-3 opacity-40" />}
                        </button>
                      ) : (
                        <span className="eyebrow">{flexRender(h.column.columnDef.header, h.getContext())}</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody key={`${pageIndex}-${pageSize}-${sorting.map((s) => s.id + s.desc).join()}`}>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row.original) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('rise group border-b border-line transition-colors duration-200 last:border-0 hover:bg-surface-2/70', onRowClick && 'cursor-pointer focus-visible:bg-surface-2')}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as ColumnMeta | undefined
                  return (
                    <td
                      key={cell.id}
                      className={cn('whitespace-nowrap px-5 py-3.5 tabular-nums text-ink-2', meta?.align === 'right' && 'text-right', meta?.align === 'center' && 'text-center', meta?.className)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-line text-muted">
              <Inbox className="size-5" />
            </span>
            <p className="text-sm text-muted">{emptyMessage}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
        <p className="text-xs text-muted">
          Showing <span className="tabular-nums text-ink-2">{first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')}</span> of{' '}
          <span className="tabular-nums text-ink-2">{total.toLocaleString('en-IN')}</span>
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
            options={PAGE_SIZES.map((s) => ({ value: s, label: `${s} / page` }))}
            className="w-[132px]"
            width={150}
            align="right"
          />
          <Button size="icon-sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[74px] text-center text-xs tabular-nums text-ink-2">
            {pageCount ? pageIndex + 1 : 0} / {pageCount}
          </span>
          <Button size="icon-sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
