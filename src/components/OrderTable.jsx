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

const PRIORITY_CLASS = {
  urgent: 'priority-urgent',
  high: 'priority-high',
  normal: 'priority-normal',
  low: 'priority-low',
}

const PRIORITY_LABEL = {
  urgent: 'Urgent',
  high: 'High',
  normal: 'Normal',
  low: 'Low',
}

const currency = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const today = () => new Date().toISOString().split('T')[0]

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

  const colSpan = role === 'owner' ? 9 : 8

  return (
    <div className="table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th className="col-expand" />
            <th>Priority</th>
            <th>PO No.</th>
            <th>Item</th>
            <th>Customer</th>
            <th className="col-num">Qty</th>
            <th className="col-num">Value</th>
            <th>Due Date</th>
            <th>Status</th>
            {role === 'owner' && <th className="col-action">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const isOverdue = order.status !== 'dispatched' && order.readiness_date < today()
            return (
              <Fragment key={order.id}>
                <tr
                  className={`order-row ${expanded === order.id ? 'row-open' : ''} ${isOverdue ? 'row-overdue' : ''}`}
                  onClick={() => toggleRow(order.id)}
                >
                  <td className="col-expand" data-label="">
                    {expanded === order.id ? (
                      <ChevronDown size={15} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                  </td>
                  <td data-label="Priority">
                    <span className={`priority-badge ${PRIORITY_CLASS[order.priority] || 'priority-normal'}`}>
                      {PRIORITY_LABEL[order.priority] || 'Normal'}
                    </span>
                  </td>
                  <td className="cell-po" data-label="PO No.">{order.po_number || '—'}</td>
                  <td className="cell-item" data-label="Item">
                    {order.item}
                    {isOverdue && <span className="overdue-tag">OVERDUE</span>}
                  </td>
                  <td data-label="Customer">{order.customer}</td>
                  <td className="col-num" data-label="Qty">{order.quantity.toLocaleString()}</td>
                  <td className="col-num" data-label="Value">{currency(order.order_value)}</td>
                  <td className="cell-date" data-label="Due Date">
                    {new Date(order.readiness_date + 'T00:00:00').toLocaleDateString()}
                  </td>
                  <td data-label="Status">
                    <span className={`status-badge ${STATUS_CLASS[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  {role === 'owner' && (
                    <td
                      className="col-action"
                      data-label="Actions"
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
                        <div className="detail-grid">
                          <div>
                            <span className="detail-label">Packaging</span>
                            <span className="detail-value">{order.packaging}</span>
                          </div>
                          <div>
                            <span className="detail-label">Branding</span>
                            <span className="detail-value">{order.branding}</span>
                          </div>
                          <div>
                            <span className="detail-label">Packing Type</span>
                            <span className="detail-value">{order.packing_type || '—'}</span>
                          </div>
                          <div>
                            <span className="detail-label">Created By</span>
                            <span className="detail-value">{order.created_by}</span>
                          </div>
                          <div className="detail-span-2">
                            <span className="detail-label">Delivery Address</span>
                            <span className="detail-value">{order.delivery_address || '—'}</span>
                          </div>
                        </div>

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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
