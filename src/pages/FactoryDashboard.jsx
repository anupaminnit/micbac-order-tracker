import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, PlayCircle, CheckCircle2, Truck, Sun, Moon } from 'lucide-react'
import { getOrders, updateOrderStatus } from '../lib/supabase'
import { localDateStr } from '../lib/dates'
import markLight from '../assets/mark-light.png'
import markDark from '../assets/mark-dark.png'
import BrandingShowcase from '../components/BrandingShowcase'
import '../styles/FactoryDashboard.css'

const POLL_INTERVAL_MS = 20_000
const THEME_STORAGE_KEY = 'micbac-factory-theme'

// One step per status; the order of keys is also the on-screen card order (closest to leaving
// the factory first).
const STEPS = {
  ready: {
    badge: 'READY',
    next: 'dispatched',
    label: 'Loaded in Trucks & Dispatched',
    Icon: Truck,
    cls: 'factory-action-dispatch',
    // Forward-only state machine, so a mis-tap can't be undone from here — confirm first.
    confirm: 'Confirm this order is LOADED IN TRUCKS and DISPATCHED? This cannot be undone.',
  },
  production: { badge: 'IN PRODUCTION', next: 'ready', label: 'Mark as Ready', Icon: CheckCircle2, cls: 'factory-action-ready' },
  pending: { badge: 'PENDING', next: 'production', label: 'Start Production', Icon: PlayCircle, cls: 'factory-action-start' },
}

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
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'dark')

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const fetchOrders = useCallback(async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true)
    setError(null)
    try {
      const groups = await Promise.all(Object.keys(STEPS).map((status) => getOrders({ status })))
      const bySoonest = (a, b) => a.readiness_date.localeCompare(b.readiness_date)
      setOrders(groups.flatMap((g) => g.sort(bySoonest)))
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

  const handleAction = async (order) => {
    const step = STEPS[order.status]
    if (step.confirm && !window.confirm(step.confirm)) return
    setUpdating(order.id)
    try {
      await updateOrderStatus(order.id, step.next, 'factory', order.status)
      // Freightysh dispatch email (notifyDispatch, src/lib/supabase.js) is paused pending Resend
      // domain verification. It used to hang off the owner's Dispatch button; dispatch now happens
      // here, but its Edge Function requires a signed-in user and Factory has none — re-enabling
      // it needs a DB-side trigger (e.g. on status -> dispatched) rather than a call from here.
      await fetchOrders(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  const prodCount = orders.filter((o) => o.status === 'production').length
  const pendCount = orders.filter((o) => o.status === 'pending').length
  const readyCount = orders.filter((o) => o.status === 'ready').length

  return (
    <div className="factory-dashboard" data-factory-theme={theme}>
      <div className="factory-shell">
        <header className="factory-header">
          <div className="factory-header-top">
            <div className="factory-brand">
              <img src={theme === 'light' ? markDark : markLight} alt="" className="factory-logo" />
              <div>
                <div className="factory-brand-name">MICBAC INDIA</div>
                <div className="factory-brand-sub">Activated Carbon · Factory</div>
              </div>
            </div>
            <div className="factory-header-actions">
              <div className="theme-switch">
                <button
                  className={`theme-switch-btn ${theme === 'light' ? 'theme-switch-btn-active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  className={`theme-switch-btn ${theme === 'dark' ? 'theme-switch-btn-active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon size={14} /> Dark
                </button>
              </div>
              <button className="btn-refresh" onClick={() => fetchOrders(true)} disabled={loading} title="Refresh">
                <RefreshCw size={16} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>
          <div className="factory-counts">
            <span className="count-pill count-pill-ready">
              <span className="count-dot count-dot-ready" />
              {readyCount} Ready
            </span>
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
              <img src={theme === 'light' ? markDark : markLight} alt="" className="factory-empty-mark" />
              <h2>All clear!</h2>
              <p>No orders waiting for production or dispatch right now.</p>
            </div>
          ) : (
            orders.map((order) => {
              const ds = urgency(order.readiness_date)
              const step = STEPS[order.status]
              const isUpdating = updating === order.id
              return (
                <div key={order.id} className={`factory-card factory-card-${ds}`}>
                  <div className="factory-card-top">
                    <span className={`factory-badge factory-badge-${order.status}`}>
                      <span className="factory-badge-dot" />
                      {step.badge}
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
                    {order.order_number && (
                      <div className="factory-field">
                        <span className="factory-field-label">Order No.</span>
                        <span className="factory-field-value factory-field-value-raw">{order.order_number}</span>
                      </div>
                    )}
                    {order.factory && (
                      <div className="factory-field">
                        <span className="factory-field-label">Factory</span>
                        <span className="factory-field-value">{order.factory}</span>
                      </div>
                    )}
                    <div className="factory-field">
                      <span className="factory-field-label">Customer</span>
                      <span className="factory-field-value">{order.customer}</span>
                    </div>
                    <div className="factory-field">
                      <span className="factory-field-label">Packaging</span>
                      <span className="factory-field-value">{order.packaging}</span>
                    </div>
                    {order.bag_count && (
                      <div className="factory-field">
                        <span className="factory-field-label">No. of Bags</span>
                        <span className="factory-field-value">{order.bag_count.toLocaleString()}</span>
                      </div>
                    )}
                    {order.bag_type && (
                      <div className="factory-field">
                        <span className="factory-field-label">Bag Type</span>
                        <span className="factory-field-value factory-field-value-raw">{order.bag_type}</span>
                      </div>
                    )}
                    {order.status === 'ready' && order.delivery_address && (
                      <div className="factory-field">
                        <span className="factory-field-label">Deliver To</span>
                        <span className="factory-field-value factory-field-value-raw">{order.delivery_address}</span>
                      </div>
                    )}
                    {order.destination_country && (
                      <div className="factory-field">
                        <span className="factory-field-label">Destination</span>
                        <span className="factory-field-value">{order.destination_country}</span>
                      </div>
                    )}
                  </div>

                  <div className="factory-branding-block">
                    <span className="factory-field-label">Branding to use</span>
                    <BrandingShowcase label={order.branding} />
                  </div>

                  {order.notes && (
                    <div className="factory-notes">
                      <span className="factory-notes-label">Notes</span>
                      {order.notes}
                    </div>
                  )}

                  <button
                    className={`factory-action ${step.cls}`}
                    onClick={() => handleAction(order)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      'Updating…'
                    ) : (
                      <>
                        <step.Icon size={18} /> {step.label}
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
