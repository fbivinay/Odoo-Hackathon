import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CalendarRange, MessageSquarePlus, Search } from 'lucide-react'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { asISODate, formatDate, formatDateTime } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useDebounced } from '@/lib/useDebounced'
import type { AdminLeaveRow, LeaveStatus } from '@/types'

const TABS: { value: LeaveStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const UNDO_WINDOW_MS = 5000

// The calendar months a leave request's date range touches, e.g. a request spanning
// 28 Aug - 2 Sep covers both August and September.
function monthsSpanned(startDate: string, endDate: string): { year: number; month: number }[] {
  const start = new Date(`${asISODate(startDate)}T00:00:00`)
  const end = new Date(`${asISODate(endDate)}T00:00:00`)
  const out: { year: number; month: number }[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cursor <= last) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

export function LeaveQueue() {
  const [tab, setTab] = useState<LeaveStatus | 'ALL'>('PENDING')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const debouncedSearch = useDebounced(search)

  const { data, loading, reload } = useApi<AdminLeaveRow[]>('/admin/leave')
  const [comments, setComments] = useState<Record<string, string>>({})
  const [commentOpenFor, setCommentOpenFor] = useState<Record<string, boolean>>({})
  const [pendingLocal, setPendingLocal] = useState<Record<string, LeaveStatus>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const all = data ?? []

  const years = useMemo(() => {
    const found = new Set<number>()
    for (const l of all) for (const s of monthsSpanned(l.startDate, l.endDate)) found.add(s.year)
    return [...found].sort((a, b) => b - a)
  }, [all])

  const countsByStatus = useMemo(() => {
    const out: Record<LeaveStatus | 'ALL', number> = { PENDING: 0, APPROVED: 0, REJECTED: 0, ALL: all.length }
    for (const l of all) out[l.status] += 1
    return out
  }, [all])

  const rows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    return all.filter((l) => {
      if (tab !== 'ALL' && l.status !== tab) return false
      if (month !== 'ALL' || year !== 'ALL') {
        const spans = monthsSpanned(l.startDate, l.endDate)
        const hit = spans.some(
          (s) => (month === 'ALL' || s.month === Number(month)) && (year === 'ALL' || s.year === Number(year)),
        )
        if (!hit) return false
      }
      if (q) {
        const haystack = `${l.employee.name} ${l.employee.employeeId} ${l.remarks ?? ''} ${l.comment ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [all, tab, month, year, debouncedSearch])

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Leave approvals</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : `${rows.length} of ${all.length} request${all.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as LeaveStatus | 'ALL')}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                {t.label}
                <span
                  className={
                    tab === t.value
                      ? 'text-xs tabular-nums text-muted-foreground'
                      : 'text-xs tabular-nums text-muted-foreground/70'
                  }
                >
                  {countsByStatus[t.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, remarks…"
              className="pl-8"
            />
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger size="sm" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All months</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          line={all.length === 0 ? 'Nothing here.' : 'No requests match these filters.'}
        />
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
                      <EmployeeQuickView employeeId={l.employee.id}>
                        <button type="button" className="text-sm font-medium hover:underline">
                          {l.employee.name}
                        </button>
                      </EmployeeQuickView>
                      <span className="text-xs text-muted-foreground">{l.employee.employeeId}</span>
                      <LeaveTypePill type={l.type} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Submitted {formatDateTime(l.createdAt)}</p>
                    {l.remarks && <p className="mt-1 text-xs text-muted-foreground">{l.remarks}</p>}
                  </div>
                  <LeaveStatusPill status={displayed} />
                </div>

                {!decided && (
                  <div className="mt-3 space-y-2">
                    {commentOpenFor[l.id] ? (
                      <Textarea
                        autoFocus
                        placeholder="Comment (optional)"
                        rows={2}
                        value={comments[l.id] ?? ''}
                        onChange={(e) => setComments((c) => ({ ...c, [l.id]: e.target.value }))}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCommentOpenFor((m) => ({ ...m, [l.id]: true }))}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquarePlus className="size-3.5" />
                        Add a comment
                      </button>
                    )}
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
