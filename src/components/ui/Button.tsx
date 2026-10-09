import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'outline' | 'ghost' | 'gold'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-bg hover:bg-ink/90 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]',
  gold: 'bg-gold text-[#0b0b0a] hover:brightness-110 shadow-[0_10px_30px_-12px_var(--gold)]',
  outline: 'border border-line-strong bg-transparent text-ink hover:border-gold/60 hover:bg-gold-wash',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3.5 text-[10px]',
  md: 'h-10 gap-2 px-5 text-[10.5px]',
  icon: 'size-10 justify-center',
  'icon-sm': 'size-8 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'outline', size = 'md', type = 'button', ...props },
  ref,
) {
  const isIcon = size === 'icon' || size === 'icon-sm'
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full transition-all duration-300 ease-lux active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        !isIcon && 'font-wide font-medium uppercase tracking-[0.14em]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
})
