import { useState, useEffect, useCallback } from 'react'
import TopNav from '../components/TopNav'
import { getAnalyticsSummary } from '../lib/analytics'
import '../styles/Analytics.css'

const STATUS_COLORS = {
  pending: '#fbbf24',
  production: '#3b82f6',
  ready: '#10b981',
  dispatched: '#9ca3af',
}
const STATUS_LABEL = {
  pending: 'Pending',
  production: 'Production',
  ready: 'Ready',
  dispatched: 'Dispatched',
}

const currency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

function donutGradient(statusCounts) {
  const total = Math.max(Object.values(statusCounts).reduce((a, b) => a + b, 0), 1)
  let acc = 0
  const stops = Object.entries(statusCounts).map(([status, count]) => {
    const start = (acc / total) * 360
    acc += count
    const end = (acc / total) * 360
    return `${STATUS_COLORS[status]} ${start}deg ${end}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export default function Analytics({ user, onLogout }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getAnalyticsSummary())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="analytics-page">
      <TopNav user={user} activePath="/analytics" onLogout={onLogout} />

      <div className="analytics-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading || !data ? (
          <div className="loading-state">Loading analytics…</div>
        ) : (
          <>
            <div className="analytics-header">
              <h1>Analytics</h1>
              <p>Performance overview</p>
            </div>

            <div className="kpi-row">
              <div className="kpi-card kpi-hero">
                <span className="kpi-label">Total Revenue</span>
                <span className="kpi-value">{currency(data.totalRevenue)}</span>
                <span className={`kpi-growth ${data.revenueGrowth >= 0 ? 'growth-up' : 'growth-down'}`}>
                  {data.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.revenueGrowth)}% vs last month
                </span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">On-Time Rate</span>
                <span className="kpi-value kpi-success">
                  {data.onTimeRate}
                  <span className="kpi-unit">%</span>
                </span>
                <span className="kpi-sub">of dispatched orders</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Avg Production</span>
                <span className="kpi-value">
                  {data.avgProductionDays}
                  <span className="kpi-unit"> days</span>
                </span>
                <span className="kpi-sub">order → dispatch</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Active Pipeline</span>
                <span className="kpi-value">{currency(data.activePipelineValue)}</span>
                <span className="kpi-sub">{data.activeCount} active orders</span>
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-card">
                <h3>Monthly Revenue</h3>
                <p className="chart-sub">Last 6 months (USD)</p>
                <div className="bar-chart-v">
                  {data.monthlyRevenue.map((b) => (
                    <div key={b.month} className="bar-col">
                      <span className="bar-value">{currency(b.revenue)}</span>
                      <div className="bar-v" style={{ height: `${Math.max(b.pct, 2)}%` }} />
                      <span className="bar-month">{b.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chart-card">
                <h3>Order Status</h3>
                <p className="chart-sub">Current distribution</p>
                <div className="donut-row">
                  <div className="donut" style={{ background: donutGradient(data.statusCounts) }} />
                  <div className="donut-legend">
                    {Object.entries(data.statusCounts).map(([status, count]) => (
                      <div key={status} className="legend-item">
                        <span className="legend-dot" style={{ background: STATUS_COLORS[status] }} />
                        <span className="legend-label">{STATUS_LABEL[status]}</span>
                        <span className="legend-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-row">
              <div className="chart-card">
                <h3>Top Customers</h3>
                <p className="chart-sub">By total order value</p>
                {data.topCustomers.length === 0 ? (
                  <p className="chart-empty">No customer data yet.</p>
                ) : (
                  <div className="customer-list">
                    {data.topCustomers.map((c) => (
                      <div key={c.name} className="customer-row">
                        <div className="customer-top">
                          <span className="customer-name">{c.name}</span>
                          <span className="customer-value">{currency(c.value)}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${Math.max(c.pct, 2)}%` }} />
                        </div>
                        <span className="customer-orders">{c.orders} orders</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="chart-card">
                <h3>Factory Throughput</h3>
                <p className="chart-sub">Orders dispatched per month</p>
                <div className="bar-chart-v">
                  {data.factoryThroughput.map((b) => (
                    <div key={b.month} className="bar-col">
                      <div className="bar-v bar-green" style={{ height: `${Math.max(b.pct, 2)}%` }} />
                      <span className="bar-month">{b.month}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
