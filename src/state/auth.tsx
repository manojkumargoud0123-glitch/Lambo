import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router'

/**
 * Front-end session for the static build. Replace `verify` with a call to the real
 * authentication API when one is available — the rest of the app only uses useAuth().
 */
export interface Session {
  email: string
  name: string
  role: string
}

const KEY = 'tl-session'

function read(): Session | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(KEY)
      if (raw) return JSON.parse(raw) as Session
    } catch {
      /* storage unavailable or corrupt — treat as signed out */
    }
  }
  return null
}

function write(session: Session | null, remember = false) {
  for (const store of [localStorage, sessionStorage]) {
    try {
      store.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }
  if (!session) return
  try {
    ;(remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session))
  } catch {
    /* the session still lives in memory for this tab */
  }
}

const nameFrom = (email: string) =>
  email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ') || 'Fleet user'

/** Simulated credential check — swap for the real API. */
async function verify(email: string, password: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 900))
  if (password.length < 6) throw new Error('That email and password combination was not recognised.')
  return { email, name: nameFrom(email), role: 'Fleet operations' }
}

interface AuthCtx {
  user: Session | null
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  signOut: () => void
}

const Ctx = createContext<AuthCtx>({ user: null, signIn: async () => {}, signOut: () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(read)

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    const session = await verify(email.trim().toLowerCase(), password)
    write(session, remember)
    setUser(session)
  }, [])

  const signOut = useCallback(() => {
    write(null)
    setUser(null)
  }, [])

  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx)

/** Sends signed-out visitors to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}
