import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'

export function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    api('/auth/verify-email', { method: 'POST', body: { token } })
      .then(() => setStatus('ok'))
      .catch((e) => {
        setStatus('error')
        setMessage(e instanceof ApiError ? e.message : 'Verification failed.')
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Email verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'pending' && <p className="text-sm text-muted-foreground">Verifying…</p>}
          {status === 'ok' && (
            <>
              <p className="text-sm text-muted-foreground">Your email is verified. You can sign in now.</p>
              <Button asChild className="w-full">
                <Link to="/sign-in">Go to sign in</Link>
              </Button>
            </>
          )}
          {status === 'error' && <p className="text-sm text-rose-600">{message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
