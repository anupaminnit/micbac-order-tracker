import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Download, RefreshCw } from 'lucide-react'
import TopNav from '../components/TopNav'
import OrderForm from '../components/OrderForm'
import OrderTable from '../components/OrderTable'
import { getOrders, getOrderStats, exportOrdersToCSV, updateOrderStatus } from '../lib/supabase'
import '../styles/OwnerDashboard.css'

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'production', label: 'In Production' },
  { key: 'ready', label: 'Ready' },
  { key: 'dispatched', label: 'Dispatched' },
]

const currency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

export default function OwnerDashboard({ user, onLogout }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    production: 0,
    ready: 0,
    dispatched: 0,
    urgent: 0,
    overdue: 0,
    pipelineValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
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

  const setStatusFilter = (status) => setFilters((f) => ({ ...f, status, priority: 'all' }))
  const setPriorityFilter = (e) => setFilters((f) => ({ ...f, priority: e.target.value }))

  return (
    <div className="owner-dashboard">
      <TopNav user={user} activePath="/owner" onLogout={onLogout}>
        <button className="btn-icon" onClick={fetchData} title="Refresh">
          <RefreshCw size={18} />
        </button>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Order
        </button>
      </TopNav>

      <div className="stats-bar">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`stat-card ${filters.status === key && filters.priority === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter(key)}
          >
            <span className="stat-count">{key === 'all' ? stats.total : stats[key] || 0}</span>
            <span className="stat-label">{label}</span>
          </button>
        ))}
        <button
          className={`stat-card stat-urgent ${filters.priority === 'urgent' ? 'active' : ''}`}
          onClick={() => setFilters((f) => ({ ...f, priority: 'urgent', status: 'all' }))}
        >
          <span className="stat-count">{stats.urgent}</span>
          <span className="stat-label">⚡ Urgent</span>
        </button>
        <div className="stat-card stat-static">
          <span className="stat-count">{currency(stats.pipelineValue)}</span>
          <span className="stat-label">Pipeline</span>
        </div>
        {stats.overdue > 0 && (
          <div className="stat-card stat-static stat-overdue">
            <span className="stat-count">{stats.overdue}</span>
            <span className="stat-label">⚠ Overdue</span>
          </div>
        )}
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
        <select className="priority-filter" value={filters.priority} onChange={setPriorityFilter}>
          <option value="all">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
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
              {filters.status !== 'all' || filters.priority !== 'all' || filters.search
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
