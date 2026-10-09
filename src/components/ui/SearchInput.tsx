import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label
      className={cn(
        'group flex h-10 items-center gap-2.5 rounded-full border border-line bg-surface-2/60 px-4 transition-colors duration-300 focus-within:border-gold/50 hover:border-line-strong',
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted transition-colors group-focus-within:text-gold" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-muted transition-colors hover:text-ink" aria-label="Clear search">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  )
}
