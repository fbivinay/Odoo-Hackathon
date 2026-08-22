import { STATUS_META } from '@/lib/attendance'
import { cn } from '@/lib/utils'
import type { DisplayStatus, LeaveStatus, LeaveType } from '@/types'

const LEAVE_META: Record<LeaveStatus, { label: string; pill: string }> = {
  PENDING: { label: 'Pending', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  APPROVED: { label: 'Approved', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  REJECTED: { label: 'Rejected', pill: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
}

const TYPE_META: Record<LeaveType, string> = {
  PAID: 'Paid',
  SICK: 'Sick',
  UNPAID: 'Unpaid',
}

const base =
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap'

export function LeaveStatusPill({ status, className }: { status: LeaveStatus; className?: string }) {
  const meta = LEAVE_META[status]
  return <span className={cn(base, meta.pill, className)}>{meta.label}</span>
}

export function AttendanceStatusPill({ status, className }: { status: DisplayStatus; className?: string }) {
  const meta = STATUS_META[status]
  return <span className={cn(base, meta.pill, className)}>{meta.label}</span>
}

export function LeaveTypePill({ type }: { type: LeaveType }) {
  return <span className={cn(base, 'bg-zinc-100 text-zinc-700 ring-zinc-500/20')}>{TYPE_META[type]}</span>
}
