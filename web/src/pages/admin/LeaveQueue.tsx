import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarRange } from 'lucide-react'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { AdminLeaveRow, LeaveStatus } from '@/types'

const TABS: { value: LeaveStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
]

const UNDO_WINDOW_MS = 5000

export function LeaveQueue() {
  const [tab, setTab] = useState<LeaveStatus | 'ALL'>('PENDING')
  const { data, loading, reload } = useApi<AdminLeaveRow[]>(
    `/admin/leave${tab === 'ALL' ? '' : `?status=${tab}`}`,
    [tab],
  )
  const [comments, setComments] = useState<Record<string, string>>({})
  const [pendingLocal, setPendingLocal] = useState<Record<string, LeaveStatus>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function commit(row: AdminLeaveRow, status: 'APPROVED' | 'REJECTED') {
    setPendingLocal((m) => ({ ...m, [row.id]: status }))

    const toastId = toast(status === 'APPROVED' ? 'Leave approved' : 'Leave rejected', {
      description: `${row.employee.name} · ${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timers.current[row.id])
          delete timers.current[row.id]
          setPendingLocal((m) => {
            const next = { ...m }
            delete next[row.id]
            return next
          })
          toast.dismiss(toastId)
        },
      },
      duration: UNDO_WINDOW_MS,
    })

    timers.current[row.id] = setTimeout(async () => {
      try {
        await api(`/admin/leave/${row.id}`, {
          method: 'PATCH',
          body: { status, comment: comments[row.id] || undefined },
        })
        reload()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Decision failed to save.')
        setPendingLocal((m) => {
          const next = { ...m }
          delete next[row.id]
          return next
        })
      }
    }, UNDO_WINDOW_MS)
  }

  const rows = data ?? []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Leave approvals</h2>
        <p className="text-xs text-muted-foreground">Approve or reject with an optional comment.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as LeaveStatus | 'ALL')}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarRange} line="Nothing here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => {
            const displayed = pendingLocal[l.id] ?? l.status
            const decided = displayed !== 'PENDING'
            return (
              <li key={l.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{l.employee.name}</p>
                      <span className="text-xs text-muted-foreground">{l.employee.employeeId}</span>
                      <LeaveTypePill type={l.type} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </p>
                    {l.remarks && <p className="mt-1 text-xs text-muted-foreground">{l.remarks}</p>}
                  </div>
                  <LeaveStatusPill status={displayed} />
                </div>

                {!decided && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Comment (optional)"
                      rows={2}
                      value={comments[l.id] ?? ''}
                      onChange={(e) => setComments((c) => ({ ...c, [l.id]: e.target.value }))}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => commit(l, 'REJECTED')}>
                        Reject leave
                      </Button>
                      <Button size="sm" onClick={() => commit(l, 'APPROVED')}>
                        Approve leave
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
