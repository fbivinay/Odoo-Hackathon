import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CalendarPlus } from 'lucide-react'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { DatePicker } from '@/components/DatePicker'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { asISODate, daysBetween, formatDate, formatDateTime, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { Leave as LeaveRow, LeaveType } from '@/types'

const today = toISODate(new Date())
const ALL = 'ALL'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

export function Leave() {
  const { data, loading, reload } = useApi<LeaveRow[]>('/leave')
  const [month, setMonth] = useState(ALL)
  const [year, setYear] = useState(ALL)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<LeaveType>('PAID')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function resetForm() {
    setType('PAID')
    setStartDate(today)
    setEndDate(today)
    setRemarks('')
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api<LeaveRow>('/leave', { method: 'POST', body: { type, startDate, endDate, remarks: remarks || undefined } })
      toast.success('Leave request submitted')
      setOpen(false)
      resetForm()
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit leave request.')
    } finally {
      setBusy(false)
    }
  }

  const all = data ?? []

  const years = useMemo(() => {
    const found = new Set<number>()
    for (const l of all) for (const s of monthsSpanned(l.startDate, l.endDate)) found.add(s.year)
    return [...found].sort((a, b) => b - a)
  }, [all])

  const rows = useMemo(
    () =>
      all.filter((l) => {
        if (month === ALL && year === ALL) return true
        return monthsSpanned(l.startDate, l.endDate).some(
          (s) => (month === ALL || s.month === Number(month)) && (year === ALL || s.year === Number(year)),
        )
      }),
    [all, month, year],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Leave</h2>
          <p className="text-xs text-muted-foreground">Apply for leave and track your requests.</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v)
            if (!v) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <CalendarPlus className="size-4" />
              Apply for leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={onSubmit}>
              <DialogHeader>
                <DialogTitle>Apply for leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="SICK">Sick</SelectItem>
                      <SelectItem value="UNPAID">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">From</Label>
                    <DatePicker id="startDate" value={startDate} onChange={setStartDate} min={today} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">To</Label>
                    <DatePicker id="endDate" value={endDate} onChange={setEndDate} min={startDate} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {daysBetween(startDate, endDate)} day{daysBetween(startDate, endDate) === 1 ? '' : 's'}
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional context for your manager"
                    rows={3}
                  />
                </div>
                {error && <p className="text-xs text-rose-600">{error}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit request'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Your requests</CardTitle>
          {all.length > 0 && (
            <div className="flex items-center gap-2">
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All months</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger size="sm" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All years</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : all.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              line="No leave requests yet."
              actionLabel="Apply for leave"
              onAction={() => setOpen(true)}
            />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No requests match this filter.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <LeaveTypePill type={l.type} />
                      <span className="text-sm">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({daysBetween(l.startDate, l.endDate)}d)
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">Submitted {formatDateTime(l.createdAt)}</p>
                    {l.remarks && <p className="mt-1 text-xs text-muted-foreground">{l.remarks}</p>}
                    {l.comment && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        HR: <span className="italic">{l.comment}</span>
                      </p>
                    )}
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
