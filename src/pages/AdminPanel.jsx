import { useState, useEffect, useCallback } from 'react'
import { LogOut, RefreshCw, Download, BarChart2 } from 'lucide-react'
import OrderTable from '../components/OrderTable'
import { getOrders, getOrderStats, exportOrdersToCSV } from '../lib/supabase'
import '../styles/AdminPanel.css'

const STAT_ITEMS = [
  { key: 'total', label: 'Total Orders', cls: 'stat-total' },
  { key: 'pending', label: 'Pending', cls: 'stat-pending' },
  { key: 'production', label: 'In Production', cls: 'stat-production' },
  { key: 'ready', label: 'Ready to Ship', cls: 'stat-ready' },
  { key: 'dispatched', label: 'Dispatched', cls: 'stat-dispatched' },
]

const BAR_ITEMS = [
  { key: 'pending', label: 'Pending', cls: 'bar-pending' },
  { key: 'production', label: 'Production', cls: 'bar-production' },
  { key: 'ready', label: 'Ready', cls: 'bar-ready' },
  { key: 'dispatched', label: 'Dispatched', cls: 'bar-dispatched' },
]

export default function AdminPanel({ user, onLogout }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, production: 0, ready: 0, dispatched: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const [ordersData, statsData] = await Promise.all([getOrders(params), getOrderStats()])
      setOrders(ordersData)
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const maxCount = Math.max(
    ...BAR_ITEMS.map(({ key }) => stats[key] || 0),
    1,
  )

  return (
    <div className="admin-panel">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>MICBAC Admin Panel</h1>
          <span className="header-user">Admin: {user.username}</span>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={fetchData} title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn-secondary" onClick={() => exportOrdersToCSV(orders)}>
            <Download size={16} /> Export
          </button>
          <button className="btn-secondary" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="admin-analytics">
        <div className="stat-grid">
          {STAT_ITEMS.map(({ key, label, cls }) => (
            <div key={key} className={`stat-box ${cls}`}>
              <span className="stat-number">{stats[key] || 0}</span>
              <span className="stat-name">{label}</span>
            </div>
          ))}
        </div>

        <div className="chart-card">
          <h3>
            <BarChart2 size={16} /> Status Distribution
          </h3>
          <div className="bar-chart">
            {BAR_ITEMS.map(({ key, label, cls }) => (
              <div key={key} className="bar-row">
                <span className="bar-label">{label}</span>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${cls}`}
                    style={{ width: `${((stats[key] || 0) / maxCount) * 100}%` }}
                  />
                </div>
                <span className="bar-count">{stats[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-table-header">
          <h2>All Orders</h2>
          <div className="status-tabs">
            {['all', 'pending', 'production', 'ready', 'dispatched'].map((s) => (
              <button
                key={s}
                className={`tab-btn ${statusFilter === s ? 'tab-active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading data…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found.</div>
        ) : (
          <OrderTable orders={orders} role="admin" onRefresh={fetchData} user={user} />
        )}
      </div>
    </div>
  )
}
