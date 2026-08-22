import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Copy, Search, UserPlus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { DataTable } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api, ApiError } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import type { ColumnDef } from '@tanstack/react-table'
import type { Employee, Role } from '@/types'

const columns: ColumnDef<Employee, any>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'employeeId', header: 'Employee ID' },
  { accessorKey: 'department', header: 'Department', cell: ({ row }) => row.original.department ?? '—' },
  { accessorKey: 'jobTitle', header: 'Title', cell: ({ row }) => row.original.jobTitle ?? '—' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={row.original.role === 'HR_ADMIN' ? 'default' : 'secondary'}>
        {row.original.role === 'HR_ADMIN' ? 'HR admin' : 'Employee'}
      </Badge>
    ),
  },
]

interface InviteResult {
  employee: Employee
  tempPassword: string
}

function InviteEmployeeDialog({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role>('EMPLOYEE')
  const [jobTitle, setJobTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<InviteResult | null>(null)

  function reset() {
    setEmployeeId('')
    setEmail('')
    setName('')
    setRole('EMPLOYEE')
    setJobTitle('')
    setDepartment('')
    setError(null)
    setResult(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = await api<InviteResult>('/admin/employees/invite', {
        method: 'POST',
        body: {
          employeeId,
          email,
          name,
          role,
          jobTitle: jobTitle || undefined,
          department: department || undefined,
        },
      })
      setResult(data)
      onInvited()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not invite employee.')
    } finally {
      setBusy(false)
    }
  }

  function copyPassword() {
    if (!result) return
    navigator.clipboard.writeText(result.tempPassword)
    toast.success('Temporary password copied')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-1.5 size-3.5" />
          Invite employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>{result.employee.name} has been added</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Share this temporary password with them directly (Slack, in person, etc.) — it will not be shown
                again, and no email is sent. They'll be asked to set their own password on first sign-in.
              </p>
              <div className="flex items-center gap-2 rounded-md border bg-zinc-50 px-3 py-2">
                <code className="flex-1 text-sm font-medium">{result.tempPassword}</code>
                <Button type="button" size="sm" variant="ghost" onClick={copyPassword}>
                  <Copy className="size-3.5" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite employee</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="employeeId">Employee ID</Label>
                  <Input id="employeeId" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="HR_ADMIN">HR admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Inviting…' : 'Invite'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function EmployeeList() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { data, loading, reload } = useApi<Employee[]>(
    `/admin/employees${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    [search],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Employees</h2>
          <p className="text-xs text-muted-foreground">{(data ?? []).length} people</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email…"
              className="pl-8"
            />
          </div>
          <InviteEmployeeDialog onInvited={reload} />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data ?? []}
        loading={loading}
        onRowClick={(e) => navigate(`/admin/employees/${e.id}`)}
        empty={<EmptyState icon={Users} line="No employees match that search." />}
      />
    </div>
  )
}
