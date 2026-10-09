import { AnimatePresence, motion } from 'motion/react'
import { Suspense, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { Toaster } from 'sonner'
import { Shield } from '@/components/brand/Logo'
import { EASE } from '@/components/ui/motion'
import { useTheme } from '@/state/theme'
import { CommandPalette } from './CommandPalette'
import { Header } from './Header'
import { Intro } from './Intro'

/** Keeps the route element a page mounted with, so an exiting page doesn't flash the next one. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export function AppShell({ prefetch }: { prefetch: () => void }) {
  const location = useLocation()
  const { theme } = useTheme()
  const [palette, setPalette] = useState(false)

  // Warm every page's code once the browser is idle, so navigation never waits on a download.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500))
    idle(() => prefetch())
  }, [prefetch])

  // Each page starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <>
      <Intro />
      <Header onOpenPalette={() => setPalette(true)} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transitionEnd: { transform: 'none' } }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.38, ease: EASE }}
        >
          <Suspense fallback={<PageLoader />}>
            <FrozenOutlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <CommandPalette open={palette} setOpen={setPalette} />
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          style: { background: 'var(--glass)', backdropFilter: 'blur(14px)', border: '1px solid var(--line)', color: 'var(--ink)', fontFamily: 'Kanit, sans-serif', borderRadius: 18 },
        }}
      />
    </>
  )
}

export function PageLoader() {
  return (
    <div className="grid h-dvh place-items-center">
      <Shield className="h-12 w-auto animate-pulse" />
    </div>
  )
}
