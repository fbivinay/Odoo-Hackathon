import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Plus } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDate, formatINR, toISODate } from '@/lib/format'
import { DEPARTMENTS, designationsFor } from '@/lib/orgStructure'
import { SHIFTS } from '@/lib/shifts'
import { useApi } from '@/lib/useApi'
import type { Employee, Payroll, Role } from '@/types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('')
}

function AddSalaryDialog({ employeeId, onCreated }: { employeeId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [baseSalary, setBaseSalary] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(toISODate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api<Payroll>('/admin/payroll', {
        method: 'POST',
        body: { employeeId, baseSalary: Number(baseSalary), effectiveDate },
      })
      toast.success('Salary structure updated')
      setOpen(false)
      setBaseSalary('')
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add salary row.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          New salary row
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Add salary row</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="baseSalary">Base salary (monthly, ₹)</Label>
              <Input
                id="baseSalary"
                type="number"
                min="1"
                step="0.01"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effectiveDate">Effective from</Label>
              <input
                id="effectiveDate"
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                required
              />
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EmployeeDetail() {
  const { id = '' } = useParams()
  const emp = useApi<Employee>(`/admin/employees/${id}`)
  const history = useApi<Payroll[]>(`/admin/payroll/${id}/history`)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ jobTitle: '', department: '', shift: '', role: 'EMPLOYEE' as Role })
  const [busy, setBusy] = useState(false)

  const employee = emp.data
  const current = history.data?.[0] ?? null

  function startEdit() {
    if (!employee) return
    setForm({
      jobTitle: employee.jobTitle ?? '',
      department: employee.department ?? '',
      shift: employee.shift ?? '',
      role: employee.role,
    })
    setEditing(true)
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api<Employee>(`/admin/employees/${id}`, { method: 'PATCH', body: form })
      toast.success('Employee updated')
      setEditing(false)
      emp.reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update employee.')
    } finally {
      setBusy(false)
    }
  }

  if (emp.loading || !employee) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link to="/admin/employees" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to employees
      </Link>

      <Card className="shadow-sm">
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16">
            <AvatarFallback className="bg-indigo-100 text-lg font-medium text-indigo-700">
              {initials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-base font-medium">{employee.name}</p>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant="secondary">{employee.employeeId}</Badge>
              <Badge variant={employee.role === 'HR_ADMIN' ? 'default' : 'outline'}>
                {employee.role === 'HR_ADMIN' ? 'HR admin' : 'Employee'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Job details</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form className="space-y-4" onSubmit={onSave}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        department: v,
                        jobTitle: designationsFor(v).includes(f.jobTitle) ? f.jobTitle : '',
                      }))
                    }
                  >
                    <SelectTrigger id="department" className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Designation</Label>
                  <Select
                    value={form.jobTitle}
                    onValueChange={(v) => setForm((f) => ({ ...f, jobTitle: v }))}
                    disabled={!form.department}
                  >
                    <SelectTrigger id="jobTitle" className="w-full">
                      <SelectValue placeholder={form.department ? 'Select title' : 'Pick a department first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {designationsFor(form.department).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shift">Shift</Label>
                  <Select value={form.shift} onValueChange={(v) => setForm((f) => ({ ...f, shift: v }))}>
                    <SelectTrigger id="shift" className="w-full">
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIFTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="HR_ADMIN">HR admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Designation</p>
                <p className="mt-0.5 text-sm">{employee.jobTitle ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="mt-0.5 text-sm">{employee.department ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shift</p>
                <p className="mt-0.5 text-sm">{employee.shift ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="mt-0.5 text-sm">{employee.phone ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="mt-0.5 text-sm">{formatDate(employee.createdAt)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Salary history</CardTitle>
            {current && <p className="mt-1 text-xs text-muted-foreground">Current: {formatINR(current.baseSalary)}/mo</p>}
          </div>
          <AddSalaryDialog employeeId={id} onCreated={history.reload} />
        </CardHeader>
        <CardContent>
          {history.loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (history.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No salary structure set yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(history.data ?? []).map((row, i) => (
                <li key={row.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm tabular-nums">{formatINR(row.baseSalary)}</span>
                  <span className="text-xs text-muted-foreground">
                    from {formatDate(row.effectiveDate)}
                    {i === 0 && ' · current'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
