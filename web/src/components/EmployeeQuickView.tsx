import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmployeeAvatar } from '@/components/EmployeeAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Employee } from '@/types'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || '—'}</p>
    </div>
  )
}

interface Props {
  employeeId: string
  children: ReactNode
}

// Lazy: fetches only when opened, so rendering many rows (leave queue, attendance grid)
// never fires a request per row.
export function EmployeeQuickView({ employeeId, children }: Props) {
  const [open, setOpen] = useState(false)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next && !employee && !loading) {
      setLoading(true)
      setError(null)
      api<Employee>(`/admin/employees/${employeeId}`)
        .then(setEmployee)
        .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load employee.'))
        .finally(() => setLoading(false))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {loading ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-sm text-rose-600">{error}</p>
        ) : employee ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">{employee.name}</DialogTitle>
              <div className="flex items-center gap-3">
                <EmployeeAvatar name={employee.name} photoUrl={employee.photoUrl} className="size-12" fallbackClassName="text-sm" />
                <div>
                  <p className="text-base font-medium">{employee.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <Badge variant="secondary">{employee.employeeId}</Badge>
                    <Badge variant={employee.role === 'HR_ADMIN' ? 'default' : 'outline'}>
                      {employee.role === 'HR_ADMIN' ? 'HR admin' : 'Employee'}
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <Field label="Department" value={employee.department ?? ''} />
              <Field label="Designation" value={employee.jobTitle ?? ''} />
              <Field label="Shift" value={employee.shift ?? ''} />
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.phone ?? ''} />
              <Field label="Joined" value={formatDate(employee.createdAt)} />
            </div>
            <DialogFooter className="sm:justify-between">
              <Button asChild variant="ghost" size="sm">
                <Link to={`/admin/employees/${employee.id}`} onClick={() => setOpen(false)}>
                  View full profile
                </Link>
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
