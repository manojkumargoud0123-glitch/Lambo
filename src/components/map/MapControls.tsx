import { AnimatePresence, motion } from 'motion/react'
import { Check, Globe, Layers, Minus, Plus, Shapes } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { BASEMAPS, type Basemap } from './basemaps'
import { useMap } from './MapView'

function Ctl({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'grid size-10 place-items-center text-ink-2 transition-colors duration-300 hover:bg-surface-3 hover:text-ink',
        active && 'bg-gold-wash text-gold hover:text-gold',
      )}
    >
      {children}
    </button>
  )
}

export function MapControls({ basemap, setBasemap, zones, setZones, onFitAll, className }: {
  basemap: Basemap
  setBasemap: (b: Basemap) => void
  zones?: boolean
  setZones?: (z: boolean) => void
  onFitAll: () => void
  className?: string
}) {
  const { map } = useMap()
  const [layersOpen, setLayersOpen] = useState(false)
  if (!map) return null

  return (
    <div className={cn('relative flex flex-col items-end gap-2', className)}>
      <div className="glass flex flex-col overflow-hidden rounded-2xl">
        <Ctl label="Zoom in" onClick={() => map.zoomIn()}>
          <Plus className="size-4" />
        </Ctl>
        <span className="mx-2.5 h-px bg-line" />
        <Ctl label="Zoom out" onClick={() => map.zoomOut()}>
          <Minus className="size-4" />
        </Ctl>
      </div>
      <div className="glass flex flex-col overflow-hidden rounded-2xl">
        <Ctl label="Fit to view" onClick={onFitAll}>
          <Globe className="size-4" />
        </Ctl>
        <Ctl label="Map layers" active={layersOpen} onClick={() => setLayersOpen((o) => !o)}>
          <Layers className="size-4" />
        </Ctl>
        {setZones && (
          <Ctl label="Geofences" active={zones} onClick={() => setZones(!zones)}>
            <Shapes className="size-4" />
          </Ctl>
        )}
      </div>

      <AnimatePresence>
        {layersOpen && (
          <motion.ul
            initial={{ opacity: 0, x: 8, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute bottom-0 right-12 w-44 rounded-2xl p-1.5"
          >
            <li className="eyebrow px-3 pb-1.5 pt-2 text-[8px]">Google layers</li>
            {(Object.keys(BASEMAPS) as Basemap[]).map((b) => (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => {
                    setBasemap(b)
                    setLayersOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-3',
                    b === basemap ? 'text-ink' : 'text-ink-2',
                  )}
                >
                  {BASEMAPS[b].label}
                  {b === basemap && <Check className="size-4 text-gold" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
