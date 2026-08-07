import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './ProtectedRoute.module.css'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.spinner} />
        <div className={styles.text}>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
