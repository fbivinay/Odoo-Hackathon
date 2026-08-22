import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarRange, LogIn, LogOut, ReceiptIndianRupee, UserRound } from 'lucide-react'
import { AttendanceRibbon, RibbonLegend } from '@/components/AttendanceRibbon'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { KpiCard } from '@/components/tremor/KpiCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { elapsed, formatDate, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { Attendance, Leave } from '@/types'

const QUICK_LINKS = [
  { to: '/profile', label: 'Profile', hint: 'Personal and job details', icon: UserRound },
  { to: '/leave', label: 'Leave', hint: 'Apply and track requests', icon: CalendarRange },
  { to: '/payroll', label: 'Payroll', hint: 'Current salary structure', icon: ReceiptIndianRupee },
]

function LiveTimer({ since }: { since: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="tabular-nums">{elapsed(since, now)}</span>
}

export function Dashboard() {
  const attendance = useApi<Attendance[]>('/attendance')
  const leave = useApi<Leave[]>('/leave')
  const [busy, setBusy] = useState(false)

  const records = attendance.data ?? []
  const today = records.find((r) => r.date === toISODate(new Date())) ?? null
  const present = records.filter((r) => r.status === 'PRESENT').length
  const absent = records.filter((r) => r.status === 'ABSENT').length
  const pending = (leave.data ?? []).filter((l) => l.status === 'PENDING').length

  async function punch(kind: 'check-in' | 'check-out') {
    setBusy(true)
    try {
      await api<Attendance>(`/attendance/${kind}`, { method: 'POST' })
      toast.success(kind === 'check-in' ? 'Checked in' : 'Checked out')
      attendance.reload()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'That did not go through.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Last 30 days</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              One bar per day, coloured by attendance status.
            </p>
          </div>
          {today?.checkIn && !today.checkOut ? (
            <Button size="sm" disabled={busy} onClick={() => punch('check-out')}>
              <LogOut className="size-4" />
              Check out · <LiveTimer since={today.checkIn} />
            </Button>
          ) : (
            <Button size="sm" disabled={busy || Boolean(today?.checkOut)} onClick={() => punch('check-in')}>
              <LogIn className="size-4" />
              {today?.checkOut ? 'Done for today' : 'Check in'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {attendance.loading ? <Skeleton className="h-10 w-full" /> : <AttendanceRibbon records={records} />}
          <RibbonLegend />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Days present" value={present} loading={attendance.loading} hint="Last 30 working days" />
        <KpiCard label="Days absent" value={absent} loading={attendance.loading} hint="Last 30 working days" />
        <KpiCard label="Leave pending" value={pending} loading={leave.loading} hint="Awaiting a decision" />
        <KpiCard
          label="Today"
          value={today?.checkIn ? (today.checkOut ? 'Checked out' : 'Checked in') : 'Not checked in'}
          loading={attendance.loading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map(({ to, label, hint, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
          >
            <div className="flex items-center gap-2.5">
              <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {leave.loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (leave.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing yet. Your leave requests will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(leave.data ?? []).slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="flex items-center gap-2 text-sm">
                      <LeaveTypePill type={l.type} />
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{l.remarks ?? 'No remarks'}</p>
                  </div>
                  <LeaveStatusPill status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
