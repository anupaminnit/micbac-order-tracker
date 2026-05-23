import React, { Fragment, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Truck } from 'lucide-react'
import { getAuditTrail } from '../lib/supabase'
import '../styles/OrderTable.css'

const STATUS_CLASS = {
  pending: 'badge-pending',
  production: 'badge-production',
  ready: 'badge-ready',
  dispatched: 'badge-dispatched',
}

const STATUS_LABEL = {
  pending: 'Pending',
  production: 'In Production',
  ready: 'Ready',
  dispatched: 'Dispatched',
}

export default function OrderTable({ orders, role, onDispatch, onRefresh, user }) {
  const [expanded, setExpanded] = useState(null)
  const [auditCache, setAuditCache] = useState({})
  const [loadingAudit, setLoadingAudit] = useState(null)

  const toggleRow = useCallback(
    async (orderId) => {
      if (expanded === orderId) {
        setExpanded(null)
        return
      }
      setExpanded(orderId)
      if (!auditCache[orderId]) {
        setLoadingAudit(orderId)
        try {
          const trail = await getAuditTrail(orderId)
          setAuditCache((c) => ({ ...c, [orderId]: trail }))
        } catch (err) {
          console.error('Audit trail fetch failed:', err)
        } finally {
          setLoadingAudit(null)
        }
      }
    },
    [expanded, auditCache],
  )

  const colSpan = role === 'owner' ? 10 : 9

  return (
    <div className="table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th className="col-expand" />
            <th>Item</th>
            <th className="col-num">Qty</th>
            <th>Customer</th>
            <th>Packaging</th>
            <th>Branding</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Created By</th>
            {role === 'owner' && <th className="col-action">Action</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <Fragment key={order.id}>
              <tr
                className={`order-row ${expanded === order.id ? 'row-open' : ''}`}
                onClick={() => toggleRow(order.id)}
              >
                <td className="col-expand">
                  {expanded === order.id ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </td>
                <td className="cell-item">{order.item}</td>
                <td className="col-num">{order.quantity.toLocaleString()}</td>
                <td>{order.customer}</td>
                <td>{order.packaging}</td>
                <td>{order.branding}</td>
                <td className="cell-date">
                  {new Date(order.readiness_date + 'T00:00:00').toLocaleDateString()}
                </td>
                <td>
                  <span className={`status-badge ${STATUS_CLASS[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </td>
                <td>{order.created_by}</td>
                {role === 'owner' && (
                  <td
                    className="col-action"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.status === 'ready' && (
                      <button
                        className="btn-dispatch"
                        onClick={() => onDispatch(order.id, order.status)}
                      >
                        <Truck size={13} /> Dispatch
                      </button>
                    )}
                  </td>
                )}
              </tr>

              {expanded === order.id && (
                <tr className="detail-row">
                  <td colSpan={colSpan}>
                    <div className="detail-panel">
                      <div className="detail-meta">
                        {order.notes && (
                          <p className="detail-notes">
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        )}
                        <p className="detail-created">
                          Created: {new Date(order.created_at).toLocaleString()}
                        </p>
                        {order.updated_at !== order.created_at && (
                          <p className="detail-updated">
                            Last updated: {new Date(order.updated_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="audit-section">
                        <h4>Audit Trail</h4>
                        {loadingAudit === order.id ? (
                          <p className="audit-loading">Loading…</p>
                        ) : !auditCache[order.id] || auditCache[order.id].length === 0 ? (
                          <p className="audit-empty">No audit records yet.</p>
                        ) : (
                          <div className="audit-list">
                            {auditCache[order.id].map((entry) => (
                              <div key={entry.id} className="audit-entry">
                                <span className="audit-action">{entry.action}</span>
                                {entry.old_status && (
                                  <span className="audit-transition">
                                    {entry.old_status} → {entry.new_status}
                                  </span>
                                )}
                                <span className="audit-by">by {entry.changed_by}</span>
                                <span className="audit-time">
                                  {new Date(entry.changed_at).toLocaleString()}
                                </span>
                                {entry.notes && (
                                  <span className="audit-notes">{entry.notes}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
