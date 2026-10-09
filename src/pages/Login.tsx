import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Shield, Wordmark } from '@/components/brand/Logo'
import { EASE, fadeUp, stagger } from '@/components/ui/motion'
import { MODELS, SITES, SITE_SEEDS } from '@/data/catalog'
import { cn } from '@/lib/cn'
import { useAuth } from '@/state/auth'

const SLIDES = [
  { src: '/media/golf.webp', kind: 'Golf Club', caption: 'Fairways, tee times and every cart in between.', position: '30% 62%' },
  { src: '/media/resort.webp', kind: 'Resort', caption: 'Guest shuttles, villa runs and lobby arrivals.', position: '62% 70%' },
  { src: '/media/hangar.webp', kind: 'Private Aviation', caption: 'Apron transfers, timed to the minute.', position: '72% 60%' },
]
const SLIDE_MS = 6500
const FLEET_SIZE = SITE_SEEDS.reduce((s, x) => s + x.fleet, 0)
const DEMO = { email: 'fleet.admin@tlfleet.demo', password: 'genesis-2026' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [remember, setRemember] = useState(true)
  const [caps, setCaps] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [scope, animate] = useAnimate()

  // Signed-in users always land on the live map.
  if (user) return <Navigate to="/" replace />

  const fail = (message: string | null, fields: typeof fieldErrors = {}) => {
    setError(message)
    setFieldErrors(fields)
    animate(scope.current, { x: [0, -10, 10, -6, 6, -2, 0] }, { duration: 0.45 })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const fields: typeof fieldErrors = {}
    if (!EMAIL_RE.test(email.trim())) fields.email = 'Enter a valid email address.'
    if (password.length < 6) fields.password = 'Password must be at least 6 characters.'
    if (fields.email || fields.password) return fail(null, fields)
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await signIn(email, password, remember)
      navigate('/', { replace: true })
    } catch (err) {
      setBusy(false)
      fail(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    }
  }

  const onKey = (e: React.KeyboardEvent) => setCaps(e.getModifierState?.('CapsLock') ?? false)

  return (
    <div data-theme="dark" className="relative grid min-h-dvh bg-[#080807] lg:grid-cols-[minmax(0,1.3fr)_minmax(480px,1fr)]">
      <Showcase />

      <main className="relative z-10 flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_70%_0%,var(--gold-wash),transparent_70%)]" />

        <div className="relative flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-3 lg:hidden">
            <Shield className="h-10 w-auto" />
            <Wordmark className="h-4 w-auto text-ink" />
          </span>
          <p className="hidden text-[12px] text-muted sm:block">
            Need access? <span className="text-ink-2">Contact your fleet administrator</span>
          </p>
        </div>

        <motion.div variants={stagger(0.07, 0.25)} initial="hidden" animate="show" className="relative mx-auto my-auto w-full max-w-[420px] py-12">
          <motion.p variants={fadeUp} className="eyebrow flex items-center gap-2.5 text-gold">
            <ShieldCheck className="size-3.5" />
            Secure access
          </motion.p>
          <motion.h1 variants={fadeUp} className="metal-text mt-5 font-wide text-[clamp(2rem,3.4vw,2.7rem)] font-light uppercase leading-[0.95]">
            Welcome back
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-3 text-[15px] text-ink-2">
            Sign in to the Tonino Lamborghini fleet console.
          </motion.p>

          <motion.form variants={fadeUp} ref={scope} onSubmit={submit} noValidate className="mt-10 space-y-5">
            <Field
              label="Email"
              icon={<Mail className="size-4" />}
              error={fieldErrors.email}
              input={(id, describedBy) => (
                <input
                  id={id}
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={describedBy}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
                />
              )}
            />
            <Field
              label="Password"
              icon={<Lock className="size-4" />}
              error={fieldErrors.password}
              hint={caps && !fieldErrors.password ? 'Caps Lock is on' : undefined}
              trailing={
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-ink"
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                >
                  {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
              input={(id, describedBy) => (
                <input
                  id={id}
                  type={reveal ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={onKey}
                  onKeyDown={onKey}
                  placeholder="••••••••"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={describedBy}
                  className="min-w-0 flex-1 bg-transparent text-[15px] tracking-wide text-ink outline-none placeholder:text-faint"
                />
              )}
            />

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] text-ink-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="peer sr-only" />
                <span className="grid size-[18px] place-items-center rounded-md border border-line-strong transition-colors peer-checked:border-gold peer-checked:bg-gold peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-gold">
                  <svg viewBox="0 0 12 12" className={cn('size-3 transition-opacity', remember ? 'opacity-100' : 'opacity-0')} aria-hidden>
                    <path d="M2.5 6.2l2.2 2.2 4.8-5" fill="none" stroke="#0b0b0a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Keep me signed in
              </label>
              <button type="button" onClick={() => setForgot((f) => !f)} className="text-[13px] text-gold transition-colors hover:text-gold-2">
                Forgot password?
              </button>
            </div>

            <AnimatePresence initial={false}>
              {forgot && (
                <motion.p
                  key="forgot"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-[13px] text-ink-2"
                >
                  <KeyRound className="mr-2 inline size-3.5 text-gold" />
                  Password resets are handled by your fleet administrator for security.
                </motion.p>
              )}
              {error && (
                <motion.p
                  key="error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-[13px] text-bad"
                >
                  <CircleAlert className="mr-2 inline size-3.5" />
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={busy}
              className="group relative mt-2 flex h-[52px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gold font-wide text-[11px] font-medium uppercase tracking-[0.2em] text-[#0b0b0a] shadow-[0_18px_40px_-16px_var(--gold)] transition-[filter,transform] duration-300 hover:brightness-110 active:scale-[0.99] disabled:cursor-wait"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/35 opacity-0 transition-[left,opacity] duration-700 ease-lux group-hover:left-[110%] group-hover:opacity-100" />
              {busy ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Verifying
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>

            <div className="flex items-center gap-4 py-1 text-[11px] uppercase tracking-[0.2em] text-faint">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail(DEMO.email)
                setPassword(DEMO.password)
                setError(null)
                setFieldErrors({})
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line-strong font-wide text-[10px] font-medium uppercase tracking-[0.18em] text-ink-2 transition-colors hover:border-gold/60 hover:bg-gold-wash hover:text-ink"
            >
              Use demo account
            </button>
          </motion.form>
        </motion.div>

        <footer className="relative flex flex-col gap-1 text-[11px] text-faint sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Tonino Lamborghini Golf Cart · Fleet Intelligence</span>
          <span>Protected access · sessions are logged</span>
        </footer>
      </main>
    </div>
  )
}

function Field({ label, icon, input, trailing, error, hint }: {
  label: string
  icon: ReactNode
  input: (id: string, describedBy?: string) => ReactNode
  trailing?: ReactNode
  error?: string
  hint?: string
}) {
  const id = useId()
  const note = error ?? hint
  const noteId = note ? `${id}-note` : undefined
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2.5 block">
        {label}
      </label>
      <div
        className={cn(
          'group flex h-[52px] items-center gap-3 rounded-2xl border bg-white/[0.03] pl-4 pr-2 transition-[border-color,background-color,box-shadow] duration-300 focus-within:bg-white/[0.05] focus-within:shadow-[0_0_0_4px_var(--gold-wash)]',
          error ? 'border-bad/60' : 'border-line hover:border-line-strong focus-within:border-gold/60',
        )}
      >
        <span className={cn('transition-colors', error ? 'text-bad' : 'text-muted group-focus-within:text-gold')}>{icon}</span>
        {input(id, noteId)}
        {trailing}
      </div>
      <AnimatePresence initial={false}>
        {note && (
          <motion.p
            id={noteId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={cn('mt-2 text-[12px]', error ? 'text-bad' : 'text-idle')}
          >
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Left-hand cinematic panel: cross-fading property scenes with a slow drift. */
function Showcase() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [index])
  const slide = SLIDES[index]

  return (
    <section className="absolute inset-0 overflow-hidden lg:relative lg:inset-auto lg:m-3 lg:mr-0 lg:rounded-[34px]" aria-label="Tonino Lamborghini Golf Cart">
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt=""
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-[1600ms] ease-lux', i === index ? 'drift opacity-100' : 'opacity-0')}
          style={{ objectPosition: s.position }}
        />
      ))}
      <div className="absolute inset-0 bg-[#080807]/80 lg:bg-transparent" />
      <div className="absolute inset-0 hidden bg-gradient-to-t from-[#080807] via-[#080807]/35 to-[#080807]/55 lg:block" />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-[#080807]/70 via-transparent to-transparent lg:block" />
      <div className="absolute inset-x-0 top-0 hidden h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent lg:block" />

      <div className="relative hidden h-full flex-col justify-between p-10 lg:flex xl:p-14">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }} className="flex items-center gap-4">
          <Shield className="h-14 w-auto" />
          <span>
            <Wordmark className="h-6 w-auto text-ink" />
            <span className="eyebrow mt-1.5 block text-[8px] tracking-[0.5em]">Golf Cart · Fleet Intelligence</span>
          </span>
        </motion.div>

        <div>
          <AnimatePresence mode="wait">
            <motion.p
              key={slide.kind}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="eyebrow flex items-center gap-3"
            >
              <span className="text-gold">{String(index + 1).padStart(2, '0')}</span>
              <span className="h-px w-10 bg-gold/50" />
              {slide.kind}
            </motion.p>
          </AnimatePresence>

          <h2 className="mt-6 font-wide text-[clamp(2.4rem,4.6vw,4.8rem)] font-light uppercase leading-[0.95]">
            {['Every cart.', 'Every course.', 'In real time.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span className="metal-text inline-block" initial={{ y: '108%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.1 }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h2>

          <AnimatePresence mode="wait">
            <motion.p
              key={slide.caption}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-5 max-w-md text-[16px] text-ink-2"
            >
              {slide.caption}
            </motion.p>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6">
            <dl className="flex gap-10">
              {[
                [FLEET_SIZE, 'Vehicles'],
                [SITES.length, 'Properties'],
                [MODELS.length, 'Genesis models'],
              ].map(([v, k]) => (
                <div key={k}>
                  <dt className="eyebrow text-[8px]">{k}</dt>
                  <dd className="mt-2 text-3xl font-extralight text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-2" role="tablist" aria-label="Scenes">
              {SLIDES.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.kind}
                  onClick={() => setIndex(i)}
                  className="relative h-[3px] w-12 overflow-hidden rounded-full bg-white/15"
                >
                  {i === index && <span key={index} className="fill-bar absolute inset-0 origin-left rounded-full bg-gold" style={{ animationDuration: `${SLIDE_MS}ms` }} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
