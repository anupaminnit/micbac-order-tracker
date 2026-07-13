import { LogOut, Sun, Moon } from 'lucide-react'
import markLight from '../assets/mark-light.png'
import { useTheme } from '../contexts/ThemeContext'
import '../styles/TopNav.css'

export default function TopNav({ user, activePath, onLogout, children }) {
  const { theme, toggleTheme } = useTheme()
  const navLinks = [
    { path: user.role === 'admin' ? '/admin' : '/owner', label: 'Orders' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/logistics', label: 'Logistics' },
    { path: '/factory', label: 'Factory View' },
  ]

  return (
    <header className="dashboard-header">
      <div className="header-brand">
        <img src={markLight} alt="" className="header-logo" />
        <div>
          <h1>MICBAC</h1>
          <span className={`role-badge role-${user.role}`}>{user.role}</span>
        </div>
      </div>
      <nav className="header-nav">
        {navLinks.map(({ path, label, disabled }) =>
          disabled ? (
            <span key={path} className="nav-link nav-disabled" title="Coming soon">
              {label}
            </span>
          ) : (
            <a
              key={path}
              href={`#${path}`}
              className={`nav-link ${activePath === path ? 'nav-active' : ''}`}
            >
              {label}
            </a>
          ),
        )}
      </nav>
      <div className="header-actions">
        {children}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <span className="header-user">{user.username}</span>
        <button className="btn-secondary" onClick={onLogout}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </header>
  )
}
