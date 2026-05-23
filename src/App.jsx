import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Package, LogIn } from 'lucide-react'
import OwnerDashboard from './pages/OwnerDashboard'
import FactoryDashboard from './pages/FactoryDashboard'
import AdminPanel from './pages/AdminPanel'

const CREDENTIALS = {
  [import.meta.env.VITE_OWNER_USERNAME || 'owner']: {
    password: import.meta.env.VITE_OWNER_PASSWORD || 'micbac2024',
    role: 'owner',
  },
  [import.meta.env.VITE_ADMIN_USERNAME || 'admin']: {
    password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin2024',
    role: 'admin',
  },
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise((r) => setTimeout(r, 300))
    const cred = CREDENTIALS[username]
    if (cred && cred.password === password) {
      onLogin({ username, role: cred.role })
    } else {
      setError('Invalid username or password')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Package size={40} />
        </div>
        <h1>MICBAC Order Tracker</h1>
        <p className="login-subtitle">Manufacturing Order Management System</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>
        <div className="login-divider">or</div>
        <a href="#/factory" className="btn-secondary btn-full factory-link">
          Factory Interface — No Login Required
        </a>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('micbac_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('micbac_user')
      }
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('micbac_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('micbac_user')
  }

  return (
    <Routes>
      <Route path="/factory" element={<FactoryDashboard />} />
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin' : '/owner'} replace />
          ) : (
            <LoginPage onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/owner"
        element={
          user ? (
            <OwnerDashboard user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/admin"
        element={
          user?.role === 'admin' ? (
            <AdminPanel user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
