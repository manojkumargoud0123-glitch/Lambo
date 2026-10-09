import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fadeUp } from '@/components/ui/motion'

/** Editorial section: index numeral, wide title, short description, optional actions. */
export function Section({ index, title, description, actions, children, className }: {
  index: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section variants={fadeUp} className={cn('mt-16 sm:mt-20', className)}>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
        <div className="flex items-baseline gap-5">
          <span className="font-wide text-[11px] font-medium text-gold">{index}</span>
          <div>
            <h2 className="font-wide text-[clamp(1.15rem,1.8vw,1.5rem)] font-light uppercase tracking-[0.06em] text-ink">{title}</h2>
            {description && <p className="mt-1.5 max-w-xl text-[14px] text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </header>
      {children}
    </motion.section>
  )
}
