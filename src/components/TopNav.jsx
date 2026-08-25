import { useState } from 'react'
import { LogOut, Sun, Moon, Menu, X } from 'lucide-react'
import markDark from '../assets/mark-dark.png'
import { useTheme } from '../contexts/ThemeContext'
import '../styles/TopNav.css'

export default function TopNav({ user, activePath, onLogout, children }) {
  const { theme, toggleTheme } = useTheme()
  const [navOpen, setNavOpen] = useState(false)
  const navLinks = [
    { path: user.role === 'admin' ? '/admin' : '/owner', label: 'Orders' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/logistics', label: 'Logistics' },
    { path: '/factory', label: 'Factory View' },
  ]

  return (
    <header className="dashboard-header">
      <div className="header-bar">
        <div className="header-brand">
          <img src={markDark} alt="" className="header-logo" />
          <div>
            <span className="header-brand-name">MICBAC</span>
            <span className={`role-badge role-${user.role}`}>{user.role}</span>
          </div>
        </div>

        <nav className="header-nav">
          {navLinks.map(({ path, label }) => (
            <a
              key={path}
              href={`#${path}`}
              className={`nav-link ${activePath === path ? 'nav-active' : ''}`}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="header-spacer" />

        <div className="header-actions">
          {children}
          <button
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className="header-user-chip">
            <span className="header-user-avatar">{user.username?.[0]?.toUpperCase() ?? 'U'}</span>
            <span className="header-user">{user.username}</span>
          </div>
          <button className="btn-secondary" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        <button
          className="header-menu-btn"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {navOpen && (
        <div className="header-mobile-nav">
          <div className="mobile-nav-links">
            {navLinks.map(({ path, label }) => (
              <a
                key={path}
                href={`#${path}`}
                className={`mobile-nav-link ${activePath === path ? 'nav-active' : ''}`}
                onClick={() => setNavOpen(false)}
              >
                {label}
              </a>
            ))}
          </div>
          <div className="mobile-nav-footer">
            <span className="mobile-nav-user">
              {user.username} · {user.role}
            </span>
            <button
              className="mobile-nav-logout"
              onClick={() => {
                setNavOpen(false)
                onLogout()
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
