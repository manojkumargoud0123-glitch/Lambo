import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { fadeUp } from './motion'

export function Card({ className, children, ...props }: HTMLMotionProps<'section'>) {
  return (
    <motion.section variants={fadeUp} className={cn('card relative overflow-hidden', className)} {...props}>
      {children}
    </motion.section>
  )
}

export function CardHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4 px-6 pt-6', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h3 className="font-wide text-[13px] font-medium uppercase tracking-[0.12em] text-ink">{title}</h3>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
