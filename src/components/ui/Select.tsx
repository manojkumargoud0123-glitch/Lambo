import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Option<T extends string> {
  value: T
  label: string
  hint?: string
  icon?: ReactNode
}

/** A searchable dropdown with keyboard support. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  icon,
  searchable = false,
  className,
  align = 'left',
  width = 260,
}: {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  label?: string
  icon?: ReactNode
  searchable?: boolean
  className?: string
  align?: 'left' | 'right'
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const current = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const openMenu = () => {
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const commit = (o?: Option<T>) => {
    if (!o) return
    onChange(o.value)
    setOpen(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      openMenu()
      return
    }
    if (!open) return
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(filtered[active])
    }
  }

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <div ref={root} className={cn('relative', className)} onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-full border border-line bg-surface-2/60 pl-4 pr-3 text-left text-[13px] transition-colors duration-300 hover:border-line-strong',
          open && 'border-gold/50',
        )}
      >
        {icon && <span className="text-muted">{icon}</span>}
        <span className="min-w-0 flex-1 truncate">
          {label && <span className="mr-1.5 text-muted">{label}</span>}
          <span className="text-ink">{current?.label ?? '—'}</span>
        </span>
        <ChevronDown className={cn('size-4 text-muted transition-transform duration-300', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ width }}
            className={cn('glass absolute z-50 mt-2 overflow-hidden rounded-2xl p-1.5', align === 'right' ? 'right-0' : 'left-0')}
          >
            {searchable && (
              <div className="flex items-center gap-2 border-b border-line px-3 pb-2 pt-1.5">
                <Search className="size-3.5 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                  placeholder="Search…"
                  className="w-full bg-transparent text-[13px] outline-none placeholder:text-faint"
                />
              </div>
            )}
            <ul ref={list} role="listbox" className="max-h-72 overflow-y-auto py-1">
              {filtered.map((o, i) => (
                <li
                  key={o.value}
                  data-index={i}
                  role="option"
                  aria-selected={o.value === value}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => commit(o)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors',
                    i === active ? 'bg-surface-3 text-ink' : 'text-ink-2',
                  )}
                >
                  {o.icon}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="text-[11px] text-muted">{o.hint}</span>}
                  {o.value === value && <Check className="size-4 text-gold" strokeWidth={2.4} />}
                </li>
              ))}
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">No matches</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
