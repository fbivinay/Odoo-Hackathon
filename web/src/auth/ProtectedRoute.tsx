import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from './session'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { employee, loading } = useSession()

  if (loading) return null
  if (!employee) return <Navigate to="/sign-in" replace />
  if (adminOnly && employee.role !== 'HR_ADMIN') return <Navigate to="/" replace />
  if (!adminOnly && employee.role === 'HR_ADMIN') return <Navigate to="/admin" replace />

  return <Outlet />
}
