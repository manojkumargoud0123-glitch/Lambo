import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EASE } from '@/components/ui/motion'

/**
 * Cinematic page opener. Always rendered in the dark palette (data-theme="dark"),
 * framed as a rounded stage so it sits well on either theme's page background.
 */
export function PageHero({
  index,
  eyebrow,
  title,
  image,
  imagePosition = 'center',
  variant = 'cover',
  narrative,
  actions,
  filters,
  children,
}: {
  index: string
  eyebrow: string
  title: string
  image: string
  imagePosition?: string
  variant?: 'cover' | 'split'
  narrative: ReactNode
  actions?: ReactNode
  filters?: ReactNode
  children?: ReactNode
}) {
  const words = title.split(' ')
  return (
    <section data-theme="dark" className="relative z-10 mx-2 mt-2 rounded-[34px] bg-[#080807] sm:mx-3 sm:mt-3">
      {/* Imagery clips to the rounded stage on its own layer, so dropdowns in the hero can extend past its edge. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[34px]">
        {variant === 'cover' ? (
          <>
            <img src={image} alt="" className="settle absolute inset-0 size-full object-cover" style={{ objectPosition: imagePosition }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080807] via-[#080807]/82 to-[#080807]/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080807] via-[#080807]/30 to-[#080807]/70" />
          </>
        ) : (
          <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
            <img src={image} alt="" className="settle size-full object-cover" style={{ objectPosition: imagePosition }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080807] via-[#080807]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080807] via-transparent to-[#080807]/50" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      {/* pt clears the floating header (≈78px tall) with breathing room, so headings never sit under it. */}
      <div className="relative mx-auto flex min-h-[620px] max-w-[1640px] flex-col justify-end px-5 pb-8 pt-[120px] sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <motion.p
            className="eyebrow flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          >
            <span className="text-gold">{index}</span>
            <span className="h-px w-10 bg-gold/50" />
            {eyebrow}
          </motion.p>
          {actions}
        </div>

        <h1 className={cn('mt-5 font-wide font-light uppercase leading-[0.92] tracking-[0.01em]', 'text-[clamp(2.6rem,7.2vw,6.6rem)]')}>
          {words.map((w, i) => (
            <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom last:mr-0">
              <motion.span className="metal-text inline-block" initial={{ y: '108%' }} animate={{ y: 0 }} transition={{ duration: 0.85, ease: EASE, delay: 0.12 + i * 0.08 }}>
                {w}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.div
          className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-2 sm:text-[17px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
        >
          {narrative}
        </motion.div>

        {filters && (
          <motion.div className="relative z-20 mt-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.38 }}>
            {filters}
          </motion.div>
        )}

        {children && (
          <motion.div className="mt-10" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}>
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
}

/** Inline number inside hero narrative copy. */
export function Em({ children }: { children: ReactNode }) {
  return <span className="font-normal text-ink">{children}</span>
}
