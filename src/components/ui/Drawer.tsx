import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'

/** Right-hand sheet for record details. Escape or backdrop click closes it. */
export function Drawer({ open, onClose, eyebrow, title, children, width = 520 }: {
  open: boolean
  onClose: () => void
  eyebrow?: ReactNode
  title?: ReactNode
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className="glass absolute inset-y-2 right-2 flex max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[28px] sm:inset-y-3 sm:right-3"
            style={{ width }}
            initial={{ x: '105%' }}
            animate={{ x: 0 }}
            exit={{ x: '105%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
                {title && <h2 className="truncate font-wide text-lg font-medium uppercase tracking-[0.06em]">{title}</h2>}
              </div>
              <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
                <X className="size-4" />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
