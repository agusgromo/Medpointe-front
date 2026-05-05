import { Navigate, useLocation } from 'react-router-dom'
import { getStoredSession } from '../services/session'

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  const session = getStoredSession()

  if (!session?.accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}