import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { BatteryLow, Bell, ChevronDown, LogOut, Menu, Moon, Search, ShieldAlert, Sun, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { Shield, Wordmark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { EASE } from '@/components/ui/motion'
import { SITE_BY_ID } from '@/data/catalog'
import { GEOFENCE_EVENTS, TODAY } from '@/data/fleet'
import { cn } from '@/lib/cn'
import { timeLabel } from '@/lib/format'
import { useAuth } from '@/state/auth'
import { useLiveFleet } from '@/state/liveFleet'
import { useTheme } from '@/state/theme'
import { NAV } from './nav'

/** Close a popover on outside click or Escape. */
function useDismiss(open: boolean, close: () => void) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return root
}

function useSignOut() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return () => {
    signOut()
    navigate('/login', { replace: true })
  }
}

function AccountMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const root = useDismiss(open, () => setOpen(false))
  const signOut = useSignOut()
  if (!user) return null
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div ref={root} className="relative ml-1 hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full border border-line bg-surface-2/40 py-1 pl-1 pr-3 transition-colors hover:border-line-strong"
      >
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-gold to-gold-2 font-wide text-[10px] font-semibold text-[#0b0b0a]">{initials}</span>
        <span className="text-left leading-tight">
          <span className="block max-w-[120px] truncate text-[12px] text-ink">{user.name}</span>
          <span className="block text-[10px] text-muted">{user.role}</span>
        </span>
        <ChevronDown className={cn('size-3.5 text-muted transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="glass absolute right-0 mt-3 w-[260px] origin-top-right overflow-hidden rounded-3xl"
          >
            <div className="border-b border-line px-5 py-4">
              <p className="text-[14px] text-ink">{user.name}</p>
              <p className="mt-0.5 truncate text-[12px] text-muted">{user.email}</p>
            </div>
            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <LogOut className="size-4 text-gold" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setMenu(false)
    setHidden(false)
  }

  // Tuck the bar away while scrolling down, bring it back on any scroll up — it never sits on headings mid-read.
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    if (y < 140) setHidden(false)
    else if (Math.abs(y - prev) > 4) setHidden(y > prev)
  })

  return (
    <>
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: hidden ? -100 : 0, opacity: 1 }}
        transition={{ duration: hidden ? 0.35 : 0.6, ease: EASE }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4"
      >
        <div className="glass mx-auto flex h-[62px] max-w-[1800px] items-center gap-3 rounded-full pl-3 pr-2 sm:pl-4">
          <Link to="/" className="group flex shrink-0 items-center gap-3" aria-label="Tonino Lamborghini Fleet — home">
            <Shield className="h-9 w-auto transition-transform duration-500 ease-lux group-hover:scale-105" />
            <span className="hidden flex-col sm:flex">
              <Wordmark className="h-[17px] w-auto text-ink" />
              <span className="eyebrow mt-1 text-[7px] tracking-[0.46em]">Fleet Intelligence</span>
            </span>
          </Link>

          <nav className="mx-auto hidden items-center gap-0.5 rounded-full border border-line bg-surface-2/40 p-1 lg:flex" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-full px-3.5 font-wide text-[9.5px] font-medium uppercase tracking-[0.16em] transition-colors duration-300 xl:px-4',
                    active ? 'text-ink' : 'text-muted hover:text-ink-2',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full border border-line-strong bg-surface-3 shadow-[var(--highlight)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    />
                  )}
                  <Icon className={cn('relative hidden size-3.5 xl:block', active && 'text-gold')} />
                  <span className="relative">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <button
              type="button"
              onClick={onOpenPalette}
              className="hidden h-10 items-center gap-2.5 rounded-full border border-line bg-surface-2/40 pl-3.5 pr-2 text-[12px] text-muted transition-colors hover:border-line-strong hover:text-ink-2 2xl:flex"
            >
              <Search className="size-4" />
              Search fleet
              <kbd className="rounded-full border border-line bg-surface-3 px-2 py-0.5 font-sans text-[10px] text-ink-2">Ctrl K</kbd>
            </button>
            <Button size="icon" variant="ghost" className="2xl:hidden" onClick={onOpenPalette} aria-label="Search">
              <Search className="size-[18px]" />
            </Button>
            <ThemeToggle />
            <Notifications />
            <AccountMenu />
            <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>{menu && <MobileMenu onClose={() => setMenu(false)} pathname={pathname} />}</AnimatePresence>
    </>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <Button size="icon" variant="ghost" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {theme === 'dark' ? <Moon className="size-[18px]" /> : <Sun className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

function Notifications() {
  const [open, setOpen] = useState(false)
  const root = useDismiss(open, () => setOpen(false))
  const vehicles = useLiveFleet()

  const items = useMemo(() => {
    const alerts = GEOFENCE_EVENTS.filter((e) => e.alert && e.entry >= TODAY)
      .slice(0, 5)
      .map((e) => ({ id: e.id, icon: ShieldAlert, title: `${e.alert} · ${e.zone}`, body: `${e.code} at ${SITE_BY_ID[e.siteId].name}`, time: timeLabel(e.entry), tone: 'bad' as const }))
    const low = vehicles
      .filter((v) => v.soc < 20 && v.status !== 'charging')
      .slice(0, 4)
      .map((v) => ({ id: v.id, icon: BatteryLow, title: `Low battery · ${Math.round(v.soc)}%`, body: `${v.code} at ${SITE_BY_ID[v.siteId].name}`, time: 'now', tone: 'warn' as const }))
    return [...low, ...alerts]
  }, [vehicles])

  return (
    <div ref={root} className="relative">
      <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)} aria-label={`Notifications (${items.length})`} aria-expanded={open}>
        <Bell className="size-[18px]" />
        {items.length > 0 && <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-accent ring-2 ring-[var(--glass)]" />}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="glass absolute right-0 mt-3 w-[340px] max-w-[calc(100vw-1.5rem)] origin-top-right overflow-hidden rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="eyebrow">Attention</p>
              <span className="text-[11px] text-muted">{items.length} today</span>
            </div>
            <ul className="max-h-[360px] overflow-y-auto p-2">
              {items.map(({ id, icon: Icon, title, body, time, tone }) => (
                <li key={id} className="flex gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-3">
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-full border border-line', tone === 'bad' ? 'text-bad' : 'text-idle')}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{title}</span>
                    <span className="block truncate text-[12px] text-muted">{body}</span>
                  </span>
                  <span className="text-[11px] tabular-nums text-muted">{time}</span>
                </li>
              ))}
              {items.length === 0 && <li className="px-3 py-10 text-center text-sm text-muted">All clear.</li>}
            </ul>
            <Link to="/geofence" onClick={() => setOpen(false)} className="block border-t border-line px-5 py-3.5 text-center font-wide text-[9.5px] uppercase tracking-[0.18em] text-gold hover:bg-surface-3">
              View geofence alerts
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MobileMenu({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const signOut = useSignOut()
  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-bg/95 px-6 pb-10 pt-6 backdrop-blur-xl"
      initial={{ clipPath: 'inset(0 0 100% 0)' }}
      animate={{ clipPath: 'inset(0 0 0% 0)' }}
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="flex items-center justify-between">
        <Shield className="h-10 w-auto" />
        <Button size="icon" variant="outline" onClick={onClose} aria-label="Close menu">
          <X className="size-5" />
        </Button>
      </div>
      <nav className="mt-12 flex flex-1 flex-col justify-center gap-1">
        {NAV.map((item, i) => {
          const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
          return (
            <motion.div key={item.to} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.12 + i * 0.05 }}>
              <NavLink to={item.to} className="group flex items-baseline gap-4 border-b border-line py-4">
                <span className="font-wide text-[10px] text-gold">{item.index}</span>
                <span className={cn('font-wide text-[clamp(1.4rem,6vw,2.2rem)] font-light uppercase tracking-[0.04em] transition-colors', active ? 'text-ink' : 'text-muted group-hover:text-ink')}>
                  {item.label}
                </span>
              </NavLink>
            </motion.div>
          )
        })}
      </nav>
      <div className="mt-10 flex items-center justify-between">
        <Wordmark className="h-5 w-auto text-ink-2" />
        <Button size="sm" variant="outline" onClick={signOut}>
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </div>
    </motion.div>
  )
}
