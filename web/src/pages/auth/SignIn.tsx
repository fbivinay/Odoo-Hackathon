import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, CalendarCheck, Clock, Eye, EyeOff, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/auth/session'
import { ApiError } from '@/lib/api'

const FEATURES = [
  { icon: Clock, title: 'Attendance, tracked automatically' },
  { icon: CalendarCheck, title: 'Leave without the back-and-forth' },
  { icon: Wallet, title: 'Payroll, always current' },
  { icon: ShieldCheck, title: 'Access that matches your role' },
]

export function SignIn() {
  const { employee, loading, signIn } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && employee) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold">
            D
          </div>
          <span className="text-base font-medium">Dayflow</span>
        </div>

        <div className="relative space-y-10">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight">
              One place to run your whole workforce.
            </h1>
            <p className="max-w-sm text-sm text-zinc-400">
              Attendance, leave, payroll, and people data — built for HR teams who'd rather manage people than
              spreadsheets.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title }) => (
              <div key={title} className="flex items-center gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="size-4.5 text-indigo-300" />
                </div>
                <p className="text-sm font-medium text-white">{title}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} Dayflow HRMS</p>
      </div>

      <div className="flex items-center justify-center bg-zinc-50 px-4 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[11px] font-semibold text-white">
                D
              </div>
              <span className="text-sm font-medium">Dayflow</span>
            </div>
          </div>

          <div className="space-y-8 rounded-xl border bg-white p-10 shadow-sm">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
              <p className="text-sm text-muted-foreground">Enter your work email and password to continue.</p>
            </div>

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee1@dayflow.dev"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={busy}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={busy}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                >
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="mt-1 w-full gap-2" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an account? Ask your admin to invite you.
          </p>
        </div>
      </div>
    </div>
  )
}
