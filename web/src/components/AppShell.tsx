import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CalendarRange,
  ChartColumn,
  LayoutDashboard,
  LogOut,
  ReceiptIndianRupee,
  Users,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/auth/session'
import { Button } from '@/components/ui/button'
import { EmployeeAvatar } from '@/components/EmployeeAvatar'
import { cn } from '@/lib/utils'

const EMPLOYEE_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Attendance', icon: CalendarDays },
  { to: '/leave', label: 'Leave', icon: CalendarRange },
  { to: '/payroll', label: 'Payroll', icon: ReceiptIndianRupee },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartColumn },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/attendance', label: 'Attendance', icon: CalendarDays },
  { to: '/admin/leave', label: 'Leave approvals', icon: CalendarRange },
]

export function AppShell() {
  const { employee, signOut } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  if (!employee) return null

  const nav = employee.role === 'HR_ADMIN' ? ADMIN_NAV : EMPLOYEE_NAV
  const activeLabel = nav.find((n) => n.to === pathname)?.label ?? 'Dayflow'

  function handleSignOut() {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-white md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[11px] font-semibold text-white">
            D
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">Dayflow</p>
            <p className="text-[11px] text-muted-foreground">Every workday, aligned</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-zinc-600" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-white/80 px-6 backdrop-blur">
          <h1 className="text-sm font-medium">{activeLabel}</h1>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs font-medium">{employee.name}</p>
              <p className="text-[11px] text-muted-foreground">{employee.email}</p>
            </div>
            <EmployeeAvatar name={employee.name} photoUrl={employee.photoUrl} className="size-8" fallbackClassName="text-xs" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
