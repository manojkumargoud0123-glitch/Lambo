import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Wordmark } from '@/components/brand/Logo'
import { stagger } from '@/components/ui/motion'

/** Content page: cinematic hero on top, editorial sections below, quiet footer. */
export function Page({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh pb-10">
      {hero}
      <motion.div variants={stagger(0.08, 0.2)} initial="hidden" animate="show" className="mx-auto max-w-[1640px] px-4 sm:px-6 lg:px-12">
        {children}
      </motion.div>
      <footer className="mx-auto mt-24 flex max-w-[1640px] flex-col items-center justify-between gap-4 border-t border-line px-4 pt-8 text-[12px] text-muted sm:flex-row sm:px-6 lg:px-12">
        <Wordmark className="h-4 w-auto text-ink-2" />
        <p>
          Designed &amp; Developed by{' '}
          <a href="https://transglobalgeomatics.com/" target="_blank" rel="noopener noreferrer" className="text-ink-2 transition-colors hover:text-gold">
            Trans Global Geomatics Pvt Ltd
          </a>
        </p>
      </footer>
    </div>
  )
}
