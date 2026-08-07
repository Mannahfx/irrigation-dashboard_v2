import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminPage from './pages/AdminPage'
import { Home, Settings } from 'lucide-react'
import styles from './App.module.css'

export default function App() {
  const { user, profile, loading, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  // Show nothing while checking auth (ProtectedRoute handles its own loading)
  if (loading) return null

  // Check if we're on the admin page
  const isOnAdmin = location.pathname === '/admin'

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className={styles.shell}>
              {/* HEADER */}
              <header className={styles.header}>
                <div className={styles.brand}>
                  <Link to={isAdmin ? '/admin' : '/'} className={styles.logoLink}>
                    <div className={styles.logo}>R</div>
                  </Link>
                  <div>
                    <div className={styles.brandName}>REVOSMART</div>
                    <div className={styles.brandSub}>Smart Irrigation Dashboard</div>
                  </div>
                </div>

                <div className={styles.headerRight}>
                  {/* Admin nav */}
                  {isAdmin && (
                    <div className={styles.headerLinks}>
                      <Link to="/admin" className={styles.adminLink}>
                        <Settings size={16} /> Admin Panel
                      </Link>
                    </div>
                  )}

                  <div className={styles.userArea}>
                    <div className={`${styles.userAvatar} ${isAdmin ? styles.userAvatarAdmin : ''}`}>
                      {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>
                        {profile?.display_name || 'User'}
                      </div>
                      <div className={`${styles.userRole} ${isAdmin ? styles.userRoleAdmin : ''}`}>
                        {isAdmin ? 'admin' : 'client'}
                      </div>
                    </div>
                  </div>

                  <button className={styles.logoutBtn} onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              </header>

              {/* ROUTES */}
              <Routes>
                <Route path="/" element={isAdmin ? <Navigate to="/admin" replace /> : <DashboardPage />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>

              <footer className={styles.footer}>
                © 2026 REVOSMART Integrated Services
              </footer>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
