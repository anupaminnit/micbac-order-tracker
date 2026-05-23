import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, PlayCircle, Package, Clock } from 'lucide-react'
import { getOrders, updateOrderStatus } from '../lib/supabase'
import '../styles/FactoryDashboard.css'

const STATUS_CLASS = {
  pending: 'card-pending',
  production: 'card-production',
}

export default function FactoryDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inProd, pending] = await Promise.all([
        getOrders({ status: 'production' }),
        getOrders({ status: 'pending' }),
      ])
      setOrders([...inProd, ...pending])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 120_000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const handleAction = async (order, newStatus) => {
    setUpdating(order.id)
    try {
      await updateOrderStatus(order.id, newStatus, 'factory', order.status)
      await fetchOrders()
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const isDueToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const isOverdue = (dateStr) => {
    return dateStr < new Date().toISOString().split('T')[0]
  }

  return (
    <div className="factory-dashboard">
      <header className="factory-header">
        <div className="factory-header-left">
          <Package size={28} />
          <div>
            <h1>MICBAC Factory</h1>
            <p>Active production orders</p>
          </div>
        </div>
        <button className="btn-refresh" onClick={fetchOrders} disabled={loading} title="Refresh">
          <RefreshCw size={20} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {error && (
        <div className="factory-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="factory-loading">
          <RefreshCw size={32} className="spin" />
          <p>Loading orders…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="factory-empty">
          <CheckCircle size={56} />
          <h2>All clear!</h2>
          <p>No pending or active orders right now.</p>
        </div>
      ) : (
        <div className="order-cards">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`order-card ${STATUS_CLASS[order.status]} ${
                isOverdue(order.readiness_date) ? 'card-overdue' : ''
              }`}
            >
              <div className="card-top">
                <span className={`factory-badge factory-badge-${order.status}`}>
                  {order.status === 'pending' ? 'PENDING' : 'IN PRODUCTION'}
                </span>
                <span
                  className={`card-date ${
                    isOverdue(order.readiness_date)
                      ? 'date-overdue'
                      : isDueToday(order.readiness_date)
                      ? 'date-today'
                      : ''
                  }`}
                >
                  <Clock size={13} />
                  {isOverdue(order.readiness_date)
                    ? 'OVERDUE'
                    : isDueToday(order.readiness_date)
                    ? 'DUE TODAY'
                    : `Due ${new Date(order.readiness_date + 'T00:00:00').toLocaleDateString()}`}
                </span>
              </div>

              <h2 className="card-item">{order.item}</h2>

              <div className="card-grid">
                <div className="card-field">
                  <span className="field-label">Quantity</span>
                  <span className="field-value qty">{order.quantity.toLocaleString()}</span>
                </div>
                <div className="card-field">
                  <span className="field-label">Customer</span>
                  <span className="field-value">{order.customer}</span>
                </div>
                <div className="card-field">
                  <span className="field-label">Packaging</span>
                  <span className="field-value">{order.packaging}</span>
                </div>
                <div className="card-field">
                  <span className="field-label">Branding</span>
                  <span className="field-value">{order.branding}</span>
                </div>
              </div>

              {order.notes && <p className="card-notes">{order.notes}</p>}

              <div className="card-actions">
                {order.status === 'pending' && (
                  <button
                    className="btn-action btn-start"
                    onClick={() => handleAction(order, 'production')}
                    disabled={updating === order.id}
                  >
                    <PlayCircle size={20} />
                    {updating === order.id ? 'Updating…' : 'Start Production'}
                  </button>
                )}
                {order.status === 'production' && (
                  <button
                    className="btn-action btn-ready"
                    onClick={() => handleAction(order, 'ready')}
                    disabled={updating === order.id}
                  >
                    <CheckCircle size={20} />
                    {updating === order.id ? 'Updating…' : 'Mark Ready'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="factory-footer">
        Auto-refreshes every 2 min · <a href="#/">Owner login</a>
      </footer>
    </div>
  )
}
