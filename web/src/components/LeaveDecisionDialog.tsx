import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { LeaveTypePill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { AdminLeaveRow } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  leave: AdminLeaveRow | null
  onDecided: () => void
}

// Standalone approve/reject popup for a single pending leave request — used wherever a
// pending row is clicked (dashboard KPI drill-downs, pending approvals card) without
// requiring the full leave queue page.
export function LeaveDecisionDialog({ open, onOpenChange, leave, onDecided }: Props) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState<'APPROVED' | 'REJECTED' | null>(null)

  useEffect(() => {
    if (open) setComment('')
  }, [open, leave?.id])

  async function decide(status: 'APPROVED' | 'REJECTED') {
    if (!leave) return
    setBusy(status)
    try {
      await api(`/admin/leave/${leave.id}`, { method: 'PATCH', body: { status, comment: comment || undefined } })
      toast.success(status === 'APPROVED' ? 'Leave approved' : 'Leave rejected')
      onDecided()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Decision failed to save.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {leave && (
          <>
            <DialogHeader>
              <DialogTitle>{leave.employee.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LeaveTypePill type={leave.type} />
                <span className="text-sm text-muted-foreground">
                  {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                </span>
              </div>
              {leave.remarks && <p className="text-sm text-muted-foreground">{leave.remarks}</p>}
              <Textarea
                placeholder="Comment (optional)"
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={busy !== null} onClick={() => decide('REJECTED')}>
                {busy === 'REJECTED' ? 'Rejecting…' : 'Reject leave'}
              </Button>
              <Button disabled={busy !== null} onClick={() => decide('APPROVED')}>
                {busy === 'APPROVED' ? 'Approving…' : 'Approve leave'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
