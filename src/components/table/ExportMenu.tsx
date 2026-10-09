import { AnimatePresence, motion } from 'motion/react'
import { Download, FileSpreadsheet, FileText, Sheet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { exportCsv, exportPdf, exportXlsx, type ExportColumn } from '@/lib/export'

export function ExportMenu<T>({ name, title, subtitle, columns, rows }: {
  name: string
  title: string
  subtitle: string
  columns: ExportColumn<T>[]
  rows: T[]
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const run = (kind: 'xlsx' | 'csv' | 'pdf') => {
    setOpen(false)
    if (!rows.length) return toast('Nothing to export', { description: 'Adjust the filters to include some records.' })
    if (kind === 'csv') exportCsv(name, columns, rows)
    if (kind === 'xlsx') exportXlsx(name, title, columns, rows)
    if (kind === 'pdf' && !exportPdf(title, subtitle, columns, rows)) {
      return toast.error('Pop-up blocked', { description: 'Allow pop-ups for this site to export a PDF.' })
    }
    toast.success(`${title} exported`, { description: `${rows.length.toLocaleString('en-IN')} records · ${kind.toUpperCase()}` })
  }

  const items = [
    { kind: 'xlsx' as const, label: 'Excel workbook', hint: '.xlsx', icon: FileSpreadsheet },
    { kind: 'csv' as const, label: 'CSV', hint: '.csv', icon: Sheet },
    { kind: 'pdf' as const, label: 'PDF report', hint: 'print', icon: FileText },
  ]

  return (
    <div ref={root} className="relative">
      <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Download className="size-3.5" />
        Export
      </Button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute right-0 z-40 mt-2 w-56 rounded-2xl p-1.5"
          >
            {items.map(({ kind, label, hint, icon: Icon }) => (
              <li key={kind}>
                <button
                  type="button"
                  onClick={() => run(kind)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  <Icon className="size-4 text-gold" />
                  <span className="flex-1">{label}</span>
                  <span className="text-[11px] text-muted">{hint}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
