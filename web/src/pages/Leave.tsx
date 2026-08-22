import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CalendarPlus } from 'lucide-react'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
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
import { daysBetween, formatDate, toISODate } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import type { Leave as LeaveRow, LeaveType } from '@/types'

const today = toISODate(new Date())

export function Leave() {
  const { data, loading, reload } = useApi<LeaveRow[]>('/leave')
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

  const rows = data ?? []

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
                    <input
                      id="startDate"
                      type="date"
                      value={startDate}
                      min={today}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">To</Label>
                    <input
                      id="endDate"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      required
                    />
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
        <CardHeader>
          <CardTitle className="text-base">Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              line="No leave requests yet."
              actionLabel="Apply for leave"
              onAction={() => setOpen(true)}
            />
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
