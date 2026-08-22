import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { useSession } from '@/auth/session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmployeeAvatar } from '@/components/EmployeeAvatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Employee } from '@/types'

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_BYTES = 2 * 1024 * 1024

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value || '—'}</p>
    </div>
  )
}

export function Profile() {
  const { employee: session, refresh } = useSession()
  const [employee, setEmployee] = useState<Employee | null>(session)
  const [editing, setEditing] = useState(false)
  const [phone, setPhone] = useState(session?.phone ?? '')
  const [address, setAddress] = useState(session?.address ?? '')
  const [busy, setBusy] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session) {
      setEmployee(session)
      setPhone(session.phone ?? '')
      setAddress(session.address ?? '')
    }
  }, [session])

  if (!employee) return <Skeleton className="h-64 w-full" />

  async function onPhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WEBP images are allowed.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Image must be 2MB or smaller.')
      return
    }
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      const updated = await api<Employee>('/me/photo', { method: 'POST', body: form })
      setEmployee(updated)
      await refresh()
      toast.success('Photo updated')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update photo.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const updated = await api<Employee>('/me', { method: 'PATCH', body: { phone, address } })
      setEmployee(updated)
      setEditing(false)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="shadow-sm">
        <CardContent className="flex items-center gap-4 pt-6">
          <EmployeeAvatar name={employee.name} photoUrl={employee.photoUrl} className="size-16" fallbackClassName="text-lg" />
          <div className="flex-1">
            <p className="text-base font-medium">{employee.name}</p>
            <p className="text-sm text-muted-foreground">
              {employee.jobTitle ?? 'No title set'} · {employee.department ?? 'No department'}
            </p>
            <Badge variant="secondary" className="mt-1.5">
              {employee.employeeId}
            </Badge>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onPhotoSelected}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}>
            <Camera className="size-4" />
            {uploadingPhoto ? 'Uploading…' : 'Change photo'}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Job details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Employee ID" value={employee.employeeId} />
          <Field label="Email" value={employee.email} />
          <Field label="Designation" value={employee.jobTitle ?? ''} />
          <Field label="Department" value={employee.department ?? ''} />
          <Field label="Joined" value={formatDate(employee.createdAt)} />
          <Field label="Role" value={employee.role === 'HR_ADMIN' ? 'HR admin' : 'Employee'} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Contact details</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form className="space-y-4" onSubmit={onSave}>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Separator />
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
              <Field label="Phone" value={employee.phone ?? ''} />
              <Field label="Address" value={employee.address ?? ''} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
