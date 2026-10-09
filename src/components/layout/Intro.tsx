import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Shield, Wordmark } from '@/components/brand/Logo'
import { EASE } from '@/components/ui/motion'
import { finishIntro } from '@/state/intro'

const KEY = 'tl-intro-seen'

function seen() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Brand reveal on the first visit of a session. Click anywhere to skip. */
export function Intro() {
  const reduced = useReducedMotion()
  const [show, setShow] = useState(() => !seen())

  useEffect(() => {
    if (!show) {
      finishIntro()
      return
    }
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShow(false), reduced ? 400 : 2600)
    return () => clearTimeout(t)
  }, [show, reduced])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          data-theme="dark"
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-[#080807]"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <img src="/media/golf.webp" alt="" className="settle absolute inset-0 size-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent,#080807_85%)]" />

          <div className="relative flex flex-col items-center">
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, ease: EASE }}>
              <Shield className="h-24 w-auto sm:h-28" />
            </motion.div>
            <motion.div
              className="mt-8 text-ink"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.4 }}
            >
              <Wordmark className="h-10 w-auto sm:h-14" />
            </motion.div>
            <motion.div
              className="mt-6 h-px w-64 origin-center bg-gradient-to-r from-transparent via-gold to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.9 }}
            />
            <motion.p
              className="mt-5 font-wide text-[10px] font-medium uppercase tracking-[0.55em] text-gold"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 1.05 }}
            >
              Golf Cart · Fleet Intelligence
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
