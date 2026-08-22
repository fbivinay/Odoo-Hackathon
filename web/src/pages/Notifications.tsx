import { Bell, BellOff } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import { useNotifications } from '@/lib/useNotifications'
import { cn } from '@/lib/utils'

export function Notifications() {
  const { notifications, loading, supported, markRead } = useNotifications()

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h2 className="text-base font-medium">Alerts</h2>
        <p className="text-xs text-muted-foreground">Leave decisions and other account activity.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">All alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !supported ? (
            <EmptyState
              icon={BellOff}
              line="Alerts aren't switched on for this workspace yet."
            />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} line="You're all caught up. Nothing here yet." />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className={cn('flex items-start justify-between gap-3 py-3', !n.read && 'bg-indigo-50/40')}>
                  <div className="flex items-start gap-2.5">
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-indigo-600')} />
                    <div>
                      <p className="text-sm">{n.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(n.createdAt)}</p>
                    </div>
                  </div>
                  {!n.read && (
                    <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
