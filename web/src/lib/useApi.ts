import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (path === null) return
    let live = true
    setLoading(true)
    setError(null)
    api<T>(path)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof ApiError ? e.message : 'Something went wrong.'))
      .finally(() => live && setLoading(false))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps])

  return { data, loading, error, reload, setData }
}
