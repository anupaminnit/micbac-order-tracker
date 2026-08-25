import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, PlayCircle, CheckCircle2 } from 'lucide-react'
import { getOrders, updateOrderStatus } from '../lib/supabase'
import { localDateStr } from '../lib/dates'
import markLight from '../assets/mark-light.png'
import '../styles/FactoryDashboard.css'

const POLL_INTERVAL_MS = 20_000

function urgency(readinessDate) {
  const today = localDateStr()
  if (readinessDate < today) return 'overdue'
  if (readinessDate === today) return 'today'
  return 'upcoming'
}

export default function FactoryDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(null)

  const fetchOrders = useCallback(async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true)
    setError(null)
    try {
      const [inProd, pending] = await Promise.all([
        getOrders({ status: 'production' }),
        getOrders({ status: 'pending' }),
      ])
      const bySoonest = (a, b) => a.readiness_date.localeCompare(b.readiness_date)
      setOrders([...inProd.sort(bySoonest), ...pending.sort(bySoonest)])
    } catch (err) {
      setError(err.message)
    } finally {
      if (isFirstLoad) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders(true)
    const interval = setInterval(() => fetchOrders(false), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const handleAction = async (order, newStatus) => {
    setUpdating(order.id)
    try {
      await updateOrderStatus(order.id, newStatus, 'factory', order.status)
      await fetchOrders(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const prodCount = orders.filter((o) => o.status === 'production').length
  const pendCount = orders.filter((o) => o.status === 'pending').length

  return (
    <div className="factory-dashboard">
      <div className="factory-shell">
        <header className="factory-header">
          <div className="factory-header-top">
            <div className="factory-brand">
              <img src={markLight} alt="" className="factory-logo" />
              <div>
                <div className="factory-brand-name">MICBAC INDIA</div>
                <div className="factory-brand-sub">Activated Carbon · Factory</div>
              </div>
            </div>
            <button className="btn-refresh" onClick={() => fetchOrders(true)} disabled={loading} title="Refresh">
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
            </button>
          </div>
          <div className="factory-counts">
            <span className="count-pill count-pill-prod">
              <span className="count-dot count-dot-prod" />
              {prodCount} In Production
            </span>
            <span className="count-pill count-pill-pend">
              <span className="count-dot count-dot-pend" />
              {pendCount} Pending
            </span>
          </div>
        </header>

        {error && (
          <div className="factory-error">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="factory-body">
          {loading ? (
            <div className="factory-loading">
              <RefreshCw size={28} className="spin" />
              <p>Loading orders…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="factory-empty">
              <img src={markLight} alt="" className="factory-empty-mark" />
              <h2>All clear!</h2>
              <p>No pending or in-production orders right now.</p>
            </div>
          ) : (
            orders.map((order) => {
              const ds = urgency(order.readiness_date)
              const isProd = order.status === 'production'
              const isUpdating = updating === order.id
              return (
                <div key={order.id} className={`factory-card factory-card-${ds}`}>
                  <div className="factory-card-top">
                    <span className={`factory-badge factory-badge-${order.status}`}>
                      <span className="factory-badge-dot" />
                      {order.status === 'pending' ? 'PENDING' : 'IN PRODUCTION'}
                    </span>
                    <span className={`factory-date factory-date-${ds}`}>
                      {ds === 'overdue'
                        ? '⚠ OVERDUE'
                        : ds === 'today'
                        ? '⚡ DUE TODAY'
                        : `Due ${new Date(order.readiness_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    </span>
                  </div>

                  <div className="factory-card-item">{order.item}</div>

                  <div className="factory-qty-row">
                    <span className="factory-qty">{order.quantity.toLocaleString()}</span>
                    <span className="factory-qty-unit">kg</span>
                  </div>

                  <div className="factory-divider" />

                  <div className="factory-fields">
                    <div className="factory-field">
                      <span className="factory-field-label">Customer</span>
                      <span className="factory-field-value">{order.customer}</span>
                    </div>
                    <div className="factory-field">
                      <span className="factory-field-label">Packaging</span>
                      <span className="factory-field-value">{order.packaging}</span>
                    </div>
                    <div className="factory-field">
                      <span className="factory-field-label">Branding</span>
                      <span className="factory-field-value">{order.branding}</span>
                    </div>
                  </div>

                  {order.notes && (
                    <div className="factory-notes">
                      <span className="factory-notes-label">Notes</span>
                      {order.notes}
                    </div>
                  )}

                  <button
                    className={`factory-action ${isProd ? 'factory-action-ready' : 'factory-action-start'}`}
                    onClick={() => handleAction(order, isProd ? 'ready' : 'production')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      'Updating…'
                    ) : isProd ? (
                      <>
                        <CheckCircle2 size={18} /> Mark as Ready
                      </>
                    ) : (
                      <>
                        <PlayCircle size={18} /> Start Production
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <footer className="factory-footer">
          Auto-refreshes every {POLL_INTERVAL_MS / 1000}s · <a href="#/">Owner login</a>
        </footer>
      </div>
    </div>
  )
}
