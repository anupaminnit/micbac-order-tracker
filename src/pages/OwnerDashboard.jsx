import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, LogOut, RefreshCw } from 'lucide-react'
import OrderForm from '../components/OrderForm'
import OrderTable from '../components/OrderTable'
import { getOrders, getOrderStats, exportOrdersToCSV, updateOrderStatus } from '../lib/supabase'
import '../styles/OwnerDashboard.css'

const STAT_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'production', label: 'In Production' },
  { key: 'ready', label: 'Ready' },
  { key: 'dispatched', label: 'Dispatched' },
]

export default function OwnerDashboard({ user, onLogout }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, production: 0, ready: 0, dispatched: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({ status: 'all', search: '', dateFrom: '', dateTo: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        status: filters.status !== 'all' ? filters.status : undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      }
      const [ordersData, statsData] = await Promise.all([getOrders(params), getOrderStats()])
      setOrders(ordersData)
      setStats(statsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDispatch = async (orderId, currentStatus) => {
    try {
      await updateOrderStatus(orderId, 'dispatched', user.username, currentStatus)
      fetchData()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="owner-dashboard">
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>MICBAC Order Tracker</h1>
          <span className="header-user">Owner: {user.username}</span>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={fetchData} title="Refresh">
            <RefreshCw size={18} />
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Order
          </button>
          <button className="btn-secondary" onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="stats-bar">
        {STAT_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`stat-card ${filters.status === key ? 'active' : ''}`}
            onClick={() => setFilters((f) => ({ ...f, status: key }))}
          >
            <span className="stat-count">
              {key === 'all' ? stats.total : stats[key] || 0}
            </span>
            <span className="stat-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="filter-bar">
        <label className="search-input">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search item or customer…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </label>
        <div className="date-filters">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            title="Due date from"
          />
          <span>to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            title="Due date to"
          />
        </div>
        <button className="btn-secondary" onClick={() => exportOrdersToCSV(orders)}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="dashboard-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>
              {filters.status !== 'all' || filters.search
                ? 'No orders match your filters.'
                : 'No orders yet. Create your first order!'}
            </p>
          </div>
        ) : (
          <OrderTable
            orders={orders}
            role="owner"
            onDispatch={handleDispatch}
            onRefresh={fetchData}
            user={user}
          />
        )}
      </div>

      {showForm && (
        <OrderForm
          user={user}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
