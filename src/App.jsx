import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LogIn } from 'lucide-react'
import { supabase, signIn, signOut, getProfile } from './lib/supabase'
import markLight from './assets/mark-light.png'
import OwnerDashboard from './pages/OwnerDashboard'
import FactoryDashboard from './pages/FactoryDashboard'
import AdminPanel from './pages/AdminPanel'
import Analytics from './pages/Analytics'
import Logistics from './pages/Logistics'

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const session = await signIn(email, password)
      const profile = await getProfile(session.user.id)
      onLogin({ id: session.user.id, email: profile.email, username: profile.username, role: profile.role })
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <img src={markLight} alt="" />
          </div>
          <div>
            <div className="login-brand-name">MICBAC INDIA</div>
            <div className="login-brand-sub">Order Management System</div>
          </div>
        </div>
        <h2 className="login-heading">Welcome back</h2>
        <p className="login-subtitle">Sign in to your dashboard</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
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
        <div className="login-secondary">
          <a href="#/factory" className="btn-secondary btn-full factory-link">
            Factory Interface — No Login Required
          </a>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadFromSession(session) {
      if (!session) {
        if (!cancelled) setUser(null)
        return
      }
      try {
        const profile = await getProfile(session.user.id)
        if (!cancelled) {
          setUser({ id: session.user.id, email: profile.email, username: profile.username, role: profile.role })
        }
      } catch {
        if (!cancelled) setUser(null)
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      loadFromSession(data.session).finally(() => {
        if (!cancelled) setCheckingSession(false)
      })
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      loadFromSession(session)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = async () => {
    await signOut()
    setUser(null)
  }

  if (checkingSession) {
    return (
      <div className="login-page">
        <p className="loading-state">Loading…</p>
      </div>
    )
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
      <Route
        path="/analytics"
        element={
          user ? (
            <Analytics user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/logistics"
        element={
          user ? (
            <Logistics user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
