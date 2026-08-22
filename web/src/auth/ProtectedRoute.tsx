import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from './session'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { employee, loading } = useSession()
  const location = useLocation()

  if (loading) return null
  if (!employee) return <Navigate to="/sign-in" replace />

  if (employee.mustChangePassword) {
    return location.pathname === '/change-password' ? <Outlet /> : <Navigate to="/change-password" replace />
  }

  if (adminOnly && employee.role !== 'HR_ADMIN') return <Navigate to="/" replace />
  if (!adminOnly && employee.role === 'HR_ADMIN') return <Navigate to="/admin" replace />

  return <Outlet />
}
