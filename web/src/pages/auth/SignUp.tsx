import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/auth/session'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[a-z]/.test(p), label: 'At least one lowercase letter' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'At least one uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'At least one number' },
]

export function SignUp() {
  const { employee, loading, signUp } = useSession()
  const [employeeId, setEmployeeId] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!loading && employee) return <Navigate to="/" replace />

  const rulesMet = RULES.every((r) => r.test(password))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!rulesMet) return
    setBusy(true)
    setError(null)
    try {
      await signUp({ employeeId, email, password, name })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <Card className="w-full max-w-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Check your email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Account created for {email}. Click the verification link we sent before signing in.
            </p>
            <Button asChild className="w-full">
              <Link to="/sign-in">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[11px] font-semibold text-white">
              D
            </div>
            <span className="text-sm font-medium">Dayflow</span>
          </div>
          <CardTitle className="text-lg">Create your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="EMP-009"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <ul className="space-y-0.5 pt-1">
                {RULES.map((r) => {
                  const met = r.test(password)
                  return (
                    <li
                      key={r.label}
                      className={cn(
                        'flex items-center gap-1.5 text-xs',
                        met ? 'text-emerald-600' : 'text-muted-foreground',
                      )}
                    >
                      {met ? <Check className="size-3" /> : <X className="size-3" />}
                      {r.label}
                    </li>
                  )
                })}
              </ul>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !rulesMet}>
              {busy ? 'Creating account…' : 'Sign up'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            New accounts sign up as employees. Roles above employee are set by an HR admin.
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link to="/sign-in" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
