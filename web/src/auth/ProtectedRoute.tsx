import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from './session'

// `anyRole` opts out of the role-exclusive redirects below — for the handful of routes
// (e.g. /notifications) that both an employee and an admin should be able to land on
// directly, without being bounced to their role's home page first.
export function ProtectedRoute({ adminOnly = false, anyRole = false }: { adminOnly?: boolean; anyRole?: boolean }) {
  const { employee, loading } = useSession()
  const location = useLocation()

  if (loading) return null
  if (!employee) return <Navigate to="/sign-in" replace />

  if (employee.mustChangePassword) {
    return location.pathname === '/change-password' ? <Outlet /> : <Navigate to="/change-password" replace />
  }

  if (anyRole) return <Outlet />
  if (adminOnly && employee.role !== 'HR_ADMIN') return <Navigate to="/" replace />
  if (!adminOnly && employee.role === 'HR_ADMIN') return <Navigate to="/admin" replace />

  return <Outlet />
}
