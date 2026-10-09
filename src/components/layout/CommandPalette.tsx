import { Command } from 'cmdk'
import { AnimatePresence, motion } from 'motion/react'
import { CornerDownLeft, MapPin, Moon, Search, Sun } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { STATUS_META } from '@/components/ui/status'
import { MODEL_IMAGE, SITES, SITE_BY_ID } from '@/data/catalog'
import { useLiveFleet } from '@/state/liveFleet'
import { useTheme } from '@/state/theme'
import { NAV } from './nav'

const groupCls =
  '[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:text-[8.5px]'
const itemCls =
  'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-ink-2 transition-colors data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink'

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const navigate = useNavigate()
  const vehicles = useLiveFleet()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass relative w-full max-w-[640px] overflow-hidden rounded-[28px]"
          >
            <Command label="Search the fleet" loop>
              <div className="flex items-center gap-3 border-b border-line px-5">
                <Search className="size-[18px] text-gold" />
                <Command.Input autoFocus placeholder="Search vehicles, drivers, properties or pages…" className="h-16 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
                <kbd className="rounded-full border border-line px-2 py-0.5 text-[10px] text-muted">Esc</kbd>
              </div>
              <Command.List className="max-h-[56vh] overflow-y-auto p-2">
                <Command.Empty className="py-14 text-center text-sm text-muted">Nothing found.</Command.Empty>

                <Command.Group heading="Navigate" className={groupCls}>
                  {NAV.map((n) => {
                    const Icon = n.icon
                    return (
                      <Command.Item key={n.to} value={`page ${n.label} ${n.description}`} onSelect={() => go(n.to)} className={itemCls}>
                        <Icon className="size-4 text-gold" />
                        <span className="flex-1">{n.label}</span>
                        <span className="text-[11px] text-muted">{n.description}</span>
                      </Command.Item>
                    )
                  })}
                  <Command.Item value="toggle theme dark light" onSelect={() => (toggle(), setOpen(false))} className={itemCls}>
                    {theme === 'dark' ? <Sun className="size-4 text-gold" /> : <Moon className="size-4 text-gold" />}
                    <span className="flex-1">Switch to {theme === 'dark' ? 'light' : 'dark'} theme</span>
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Properties" className={groupCls}>
                  {SITES.map((s) => (
                    <Command.Item key={s.id} value={`site ${s.name} ${s.city} ${s.kind}`} onSelect={() => go(`/?site=${s.id}`)} className={itemCls}>
                      <MapPin className="size-4 text-gold" />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-[11px] text-muted">
                        {s.kind} · {s.city}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group heading="Vehicles" className={groupCls}>
                  {vehicles.map((v) => (
                    <Command.Item
                      key={v.id}
                      value={`vehicle ${v.code} ${v.driver ?? ''} ${v.model.name} ${SITE_BY_ID[v.siteId].name}`}
                      onSelect={() => go(`/?v=${v.id}`)}
                      className={itemCls}
                    >
                      <img src={MODEL_IMAGE[v.model.id]} alt="" className="h-6 w-10 object-contain" />
                      <span className="flex-1">
                        <span className="text-ink">{v.code}</span>
                        <span className="ml-2 text-muted">{v.driver ?? 'Unassigned'}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-muted">
                        <span className="size-1.5 rounded-full" style={{ background: STATUS_META[v.status].color }} />
                        {STATUS_META[v.status].label}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
              <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[11px] text-muted">
                <span>Tonino Lamborghini · Fleet Intelligence</span>
                <span className="flex items-center gap-1.5">
                  <CornerDownLeft className="size-3" /> to open
                </span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
