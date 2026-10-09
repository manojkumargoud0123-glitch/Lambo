import { cn } from '@/lib/cn'
import { WORDMARK_BOX, WORDMARK_PATH } from './wordmarkPath'

const SHIELD_SRC = '/brand/shield.png'

/** The red bull shield on its own. */
export function Shield({ className }: { className?: string }) {
  return <img src={SHIELD_SRC} alt="" aria-hidden draggable={false} className={cn('select-none object-contain', className)} />
}

/** Script wordmark only, tightly cropped. Inherits text colour. */
export function Wordmark({ className, title = 'Tonino Lamborghini' }: { className?: string; title?: string }) {
  const { x, y, width, height } = WORDMARK_BOX
  return (
    <svg viewBox={`${x} ${y} ${width} ${height}`} className={cn('block', className)} role="img" aria-label={title}>
      <path d={WORDMARK_PATH} fill="currentColor" />
    </svg>
  )
}

/**
 * The official lockup: shield, script wordmark and the "GOLF CART" descriptor,
 * laid out exactly as the source artwork (1000 × 264.645).
 */
export function LogoFull({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 264.645" className={cn('block', className)} role="img" aria-label="Tonino Lamborghini Golf Cart">
      <image href={SHIELD_SRC} width="159.671" height="225.806" />
      <path d={WORDMARK_PATH} fill="currentColor" />
      <text
        x="496.517"
        y="238.525"
        fill="currentColor"
        fontSize="37"
        fontWeight="700"
        letterSpacing="0.048em"
        style={{ fontFamily: "'Chakra Petch', 'Georama', sans-serif" }}
      >
        GOLF CART
      </text>
    </svg>
  )
}
