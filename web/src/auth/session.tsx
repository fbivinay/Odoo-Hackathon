import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'
import { clearToken, decodeToken, getToken, setToken } from '@/lib/token'
import type { AuthResponse, Employee } from '@/types'

interface SignUpInput {
  employeeId: string
  email: string
  password: string
  name: string
}

interface SessionValue {
  employee: Employee | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  signOut: () => void
  refresh: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    const employee = await api<Employee>('/me')
    setEmployee(employee)
  }

  useEffect(() => {
    const token = getToken()
    if (!token || !decodeToken(token)) {
      setLoading(false)
      return
    }
    refresh()
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<SessionValue>(
    () => ({
      employee,
      loading,
      async signIn(email, password) {
        const { token } = await api<AuthResponse>('/auth/signin', {
          method: 'POST',
          body: { email, password },
        })
        setToken(token)
        await refresh()
      },
      async signUp(input) {
        await api('/auth/signup', { method: 'POST', body: input })
      },
      signOut() {
        clearToken()
        setEmployee(null)
      },
      refresh,
    }),
    [employee, loading],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export { ApiError }
