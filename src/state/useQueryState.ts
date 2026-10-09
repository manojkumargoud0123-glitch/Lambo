import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** A string state value mirrored into the URL query, so filtered views are linkable. */
export function useQueryState<T extends string>(key: string, fallback: T) {
  const [params, setParams] = useSearchParams()
  const value = (params.get(key) as T | null) ?? fallback

  const set = useCallback(
    (next: T | null) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === null || next === fallback || next === '') p.delete(key)
          else p.set(key, next)
          return p
        },
        { replace: true },
      )
    },
    [key, fallback, setParams],
  )

  return [value, set] as const
}
