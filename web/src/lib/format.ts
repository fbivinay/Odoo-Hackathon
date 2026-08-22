export function formatINR(amount: number | string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(typeof amount === 'string' ? parseFloat(amount) : amount)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// API date fields (Attendance.date, Leave.startDate/endDate, Payroll.effectiveDate) come back
// as full ISO datetimes at UTC midnight, not plain YYYY-MM-DD — normalize before comparing.
export function asISODate(value: string): string {
  return value.slice(0, 10)
}

export function elapsed(fromISO: string, now = Date.now()): string {
  const secs = Math.max(0, Math.floor((now - new Date(fromISO).getTime()) / 1000))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function daysBetween(startISO: string, endISO: string): number {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime()
  return Math.floor(ms / 86400000) + 1
}
