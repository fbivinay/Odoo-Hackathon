import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from './api'
import type { Notification } from '@/types'

// GET /api/me/notifications doesn't exist on the deployed backend yet (see the standing
// backend handoff notes, §2a). Treat a missing endpoint the same as "no notifications" rather
// than surfacing an error banner for a feature that's simply not live yet — this hook goes
// from a silent no-op to fully functional the moment the endpoint ships, no code change needed.
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api<Notification[]>('/me/notifications')
      .then((data) => {
        setNotifications(data)
        setSupported(true)
      })
      .catch((e) => {
        setNotifications([])
        setSupported(!(e instanceof ApiError && e.code === 'NOT_FOUND'))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function markRead(id: string) {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await api(`/me/notifications/${id}/read`, { method: 'PATCH' })
    } catch {
      // Endpoint not live yet or the request failed — the optimistic update already reflects
      // in this session; a reload will re-sync with the server once it's live.
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, loading, supported, unreadCount, reload: load, markRead }
}
