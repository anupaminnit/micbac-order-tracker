import { useState, useEffect, useCallback } from 'react'
import TopNav from '../components/TopNav'
import LogisticsCard from '../components/LogisticsCard'
import { getDispatchedOrdersWithLogistics, getLogisticsDocumentCounts } from '../lib/logistics'
import '../styles/Logistics.css'

const DEFAULT_LOGISTICS = {
  container_number: null,
  shipping_line: null,
  booking_ref: null,
  transporter: null,
  vehicle_number: null,
  customs_status: 'not_filed',
  overall_status: 'pending',
}

export default function Logistics({ user, onLogout }) {
  const [shipments, setShipments] = useState([])
  const [docCounts, setDocCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    setError(null)
    try {
      const rows = await getDispatchedOrdersWithLogistics()
      setShipments(rows)
      const ids = rows.filter((r) => r.logistics).map((r) => r.logistics.id)
      setDocCounts(await getLogisticsDocumentCounts(ids))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const withDefaults = shipments.map((s) => ({
    ...s,
    effective: s.logistics || DEFAULT_LOGISTICS,
  }))

  const activeShipments = withDefaults.filter((s) => s.effective.overall_status !== 'delivered').length
  const containerPending = withDefaults.filter((s) => !s.effective.container_number).length
  const customsCleared = withDefaults.filter((s) => s.effective.customs_status === 'cleared').length
  const documentsMissing = withDefaults.filter(
    (s) => !s.logistics || !(docCounts[s.logistics.id] > 0),
  ).length

  return (
    <div className="logistics-page">
      <TopNav user={user} activePath="/logistics" onLogout={onLogout} />

      <div className="logistics-content">
        <div className="logistics-header">
          <h1>Logistics</h1>
          <p>Post-dispatch shipping, customs &amp; document tracking</p>
        </div>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">Loading shipments…</div>
        ) : shipments.length === 0 ? (
          <div className="empty-state">
            <p>No dispatched orders yet. Shipments appear here once an order is dispatched.</p>
          </div>
        ) : (
          <>
            <div className="logistics-kpi-strip">
              <div className="logistics-kpi">
                <span className="kpi-count">{activeShipments}</span>
                <span className="kpi-label">Active Shipments</span>
              </div>
              <div className="logistics-kpi kpi-warn">
                <span className="kpi-count">{containerPending}</span>
                <span className="kpi-label">⚠ Container Pending</span>
              </div>
              <div className="logistics-kpi">
                <span className="kpi-count">{documentsMissing}</span>
                <span className="kpi-label">Documents Missing</span>
              </div>
              <div className="logistics-kpi kpi-good">
                <span className="kpi-count">{customsCleared}</span>
                <span className="kpi-label">Customs Cleared</span>
              </div>
            </div>

            <div className="logistics-list">
              {shipments.map(({ order, logistics }) => (
                <LogisticsCard
                  key={order.id}
                  order={order}
                  logistics={logistics}
                  docCount={logistics ? docCounts[logistics.id] || 0 : 0}
                  onChange={fetchData}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
