import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmployeeAvatar } from '@/components/EmployeeAvatar'
import { EmployeeQuickView } from '@/components/EmployeeQuickView'
import { LeaveDecisionDialog } from '@/components/LeaveDecisionDialog'
import { LeaveStatusPill, LeaveTypePill } from '@/components/StatusPill'
import { formatDate } from '@/lib/format'
import type { AdminLeaveRow, Employee } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  employees?: Employee[]
  leaveRows?: AdminLeaveRow[]
  // Pending-leave lists let the admin click a row to approve/reject right here.
  decidable?: boolean
  onDecided?: () => void
}

// Generic drill-down popup for a clickable KPI/count on the admin overview — shows the
// employees or leave requests that make up that number, without leaving the page.
export function KpiListDialog({ open, onOpenChange, title, employees, leaveRows, decidable, onDecided }: Props) {
  const [decidingRow, setDecidingRow] = useState<AdminLeaveRow | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {employees && (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {employees.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nobody here.</p>
              ) : (
                employees.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <EmployeeQuickView employeeId={e.id}>
                      <button type="button" className="flex items-center gap-3 text-left hover:underline">
                        <EmployeeAvatar name={e.name} photoUrl={e.photoUrl} className="size-8" fallbackClassName="text-xs" />
                        <span>
                          <span className="block text-sm font-medium">{e.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {e.department ?? '—'} · {e.jobTitle ?? '—'}
                          </span>
                        </span>
                      </button>
                    </EmployeeQuickView>
                    {e.shift && (
                      <Badge variant="outline" className="ml-auto shrink-0">
                        {e.shift}
                      </Badge>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}

          {leaveRows && (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {leaveRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nothing here.</p>
              ) : (
                leaveRows.map((l) => (
                  <li
                    key={l.id}
                    onClick={decidable ? () => setDecidingRow(l) : undefined}
                    className={`flex items-center justify-between gap-3 py-2.5 ${decidable ? 'cursor-pointer rounded-md px-2 -mx-2 hover:bg-zinc-50' : ''}`}
                  >
                    <div>
                      <p className="flex items-center gap-2 text-sm">
                        <span onClick={(e) => e.stopPropagation()}>
                          <EmployeeQuickView employeeId={l.employee.id}>
                            <button type="button" className="font-medium hover:underline">
                              {l.employee.name}
                            </button>
                          </EmployeeQuickView>
                        </span>
                        <LeaveTypePill type={l.type} />
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </p>
                    </div>
                    <LeaveStatusPill status={l.status} />
                  </li>
                ))
              )}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <LeaveDecisionDialog
        open={decidingRow !== null}
        onOpenChange={(next) => !next && setDecidingRow(null)}
        leave={decidingRow}
        onDecided={() => {
          setDecidingRow(null)
          onDecided?.()
        }}
      />
    </>
  )
}
