import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { SessionProvider } from '@/auth/session'
import { AppShell } from '@/components/AppShell'
import { SignIn } from '@/pages/auth/SignIn'
import { ChangePassword } from '@/pages/auth/ChangePassword'

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })))
const Attendance = lazy(() => import('@/pages/Attendance').then((m) => ({ default: m.Attendance })))
const Leave = lazy(() => import('@/pages/Leave').then((m) => ({ default: m.Leave })))
const Payroll = lazy(() => import('@/pages/Payroll').then((m) => ({ default: m.Payroll })))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })))
const Analytics = lazy(() => import('@/pages/admin/Analytics').then((m) => ({ default: m.Analytics })))
const EmployeeList = lazy(() => import('@/pages/admin/EmployeeList').then((m) => ({ default: m.EmployeeList })))
const EmployeeDetail = lazy(() => import('@/pages/admin/EmployeeDetail').then((m) => ({ default: m.EmployeeDetail })))
const AttendanceGrid = lazy(() => import('@/pages/admin/AttendanceGrid').then((m) => ({ default: m.AttendanceGrid })))
const LeaveQueue = lazy(() => import('@/pages/admin/LeaveQueue').then((m) => ({ default: m.LeaveQueue })))

function RouteFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/sign-in" element={<SignIn />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePassword />} />
              <Route element={<AppShell />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/leave" element={<Leave />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute adminOnly />}>
              <Route element={<AppShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/employees" element={<EmployeeList />} />
                <Route path="/admin/employees/:id" element={<EmployeeDetail />} />
                <Route path="/admin/attendance" element={<AttendanceGrid />} />
                <Route path="/admin/leave" element={<LeaveQueue />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </SessionProvider>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}
