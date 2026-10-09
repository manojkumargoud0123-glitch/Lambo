import { motion } from 'motion/react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  const id = useId()
  return (
    <div role="tablist" className={cn('inline-flex items-center rounded-full border border-line bg-surface-2/60 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-full font-wide font-medium uppercase tracking-[0.14em] transition-colors duration-300',
              size === 'sm' ? 'h-7 px-3 text-[9.5px]' : 'h-8 px-4 text-[10px]',
              active ? 'text-ink' : 'text-muted hover:text-ink-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full border border-line-strong bg-surface-3 shadow-[var(--highlight)]"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
