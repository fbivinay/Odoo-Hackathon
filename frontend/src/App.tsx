import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { SessionProvider } from '@/auth/session'
import { AppShell } from '@/components/AppShell'
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { VerifyEmail } from '@/pages/auth/VerifyEmail'
import { Dashboard } from '@/pages/Dashboard'
import { Profile } from '@/pages/Profile'
import { Attendance } from '@/pages/Attendance'
import { Leave } from '@/pages/Leave'
import { Payroll } from '@/pages/Payroll'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { EmployeeList } from '@/pages/admin/EmployeeList'
import { EmployeeDetail } from '@/pages/admin/EmployeeDetail'
import { AttendanceGrid } from '@/pages/admin/AttendanceGrid'
import { LeaveQueue } from '@/pages/admin/LeaveQueue'

export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route element={<ProtectedRoute />}>
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
              <Route path="/admin/employees" element={<EmployeeList />} />
              <Route path="/admin/employees/:id" element={<EmployeeDetail />} />
              <Route path="/admin/attendance" element={<AttendanceGrid />} />
              <Route path="/admin/leave" element={<LeaveQueue />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
      <Toaster position="top-right" />
    </BrowserRouter>
  )
}
