import { Fragment, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Pencil, Ban } from 'lucide-react'
import { getAuditTrail } from '../lib/supabase'
import { localDateStr } from '../lib/dates'
import { useIsMobile } from '../hooks/useIsMobile'
import BrandingBadge from './BrandingBadge'
import { orderProfit } from '../lib/profit'
import '../styles/OrderTable.css'

const STATUS_CLASS = {
  pending: 'badge-pending',
  production: 'badge-production',
  ready: 'badge-ready',
  dispatched: 'badge-dispatched',
  cancelled: 'badge-cancelled',
}

const STATUS_LABEL = {
  pending: 'Pending',
  production: 'In Production',
  ready: 'Ready',
  dispatched: 'Dispatched',
  cancelled: 'Cancelled',
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

const PRIORITY_DOT = {
  urgent: '#dc2626',
  high: '#ea580c',
  normal: '#3b82f6',
  low: '#a8a29e',
}

const currency = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const kg = (n) => `${n.toLocaleString()} kg`

const today = () => localDateStr()

function PriorityBadge({ priority }) {
  return (
    <span className={`priority-badge ${PRIORITY_CLASS[priority] || 'priority-normal'}`}>
      <span className="priority-dot" style={{ background: PRIORITY_DOT[priority] || PRIORITY_DOT.normal }} />
      {PRIORITY_LABEL[priority] || 'Normal'}
    </span>
  )
}

function OrderDetail({ order, auditCache, loadingAudit }) {
  const entries = auditCache[order.id]
  const profit = orderProfit(order)
  return (
    <div className="detail-panel" style={{ borderLeftColor: PRIORITY_DOT[order.priority] || PRIORITY_DOT.normal }}>
      <div className="detail-grid">
        <div>
          <span className="detail-label">Destination</span>
          <span className="detail-value">{order.destination_country || '—'}</span>
        </div>
        <div>
          <span className="detail-label">PO Number</span>
          <span className="detail-value">{order.po_number || '—'}</span>
        </div>
        <div>
          <span className="detail-label">Cost / Selling</span>
          <span className="detail-value">
            {currency(order.order_value)} / {currency(order.selling_price)}
          </span>
        </div>
        <div>
          <span className="detail-label">Gross Profit</span>
          <span className={`detail-value ${profit && profit.profit < 0 ? 'detail-loss' : ''}`}>
            {profit ? `${currency(profit.profit)}${profit.margin != null ? ` (${profit.margin.toFixed(1)}%)` : ''}` : '—'}
          </span>
        </div>
        <div>
          <span className="detail-label">Packaging</span>
          <span className="detail-value">{order.packaging}</span>
        </div>
        <div>
          <span className="detail-label">Branding</span>
          <span className="detail-value"><BrandingBadge label={order.branding} /></span>
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
        <p className="detail-created">Created: {new Date(order.created_at).toLocaleString()}</p>
        {order.updated_at !== order.created_at && (
          <p className="detail-updated">Last updated: {new Date(order.updated_at).toLocaleString()}</p>
        )}
      </div>

      <div className="audit-section">
        <h4>Audit Trail</h4>
        {loadingAudit === order.id ? (
          <p className="audit-loading">Loading…</p>
        ) : !entries || entries.length === 0 ? (
          <p className="audit-empty">No audit records yet.</p>
        ) : (
          <div className="audit-list">
            {entries.map((entry) => (
              <div key={entry.id} className="audit-entry">
                <span className="audit-action">{entry.action}</span>
                {entry.old_status && (
                  <span className="audit-transition">
                    {entry.old_status} → {entry.new_status}
                  </span>
                )}
                <span className="audit-by">by {entry.changed_by}</span>
                <span className="audit-time">{new Date(entry.changed_at).toLocaleString()}</span>
                {entry.notes && <span className="audit-notes">{entry.notes}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrderTable({ orders, role, onEdit, onCancel }) {
  const [expanded, setExpanded] = useState(null)
  const [auditCache, setAuditCache] = useState({})
  const [loadingAudit, setLoadingAudit] = useState(null)
  const isMobile = useIsMobile()

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

  if (isMobile) {
    return (
      <div className="order-cards">
        {orders.map((order) => {
          const isOverdue = order.status !== 'dispatched' && order.readiness_date < today()
          const isOpen = expanded === order.id
          return (
            <div
              key={order.id}
              className={`order-card ${isOverdue ? 'order-card-overdue' : ''}`}
              style={{ borderLeftColor: PRIORITY_DOT[order.priority] || PRIORITY_DOT.normal }}
              onClick={() => toggleRow(order.id)}
            >
              <div className="order-card-top">
                <div className="order-card-heading">
                  <div className="order-card-item">{order.item}</div>
                  <div className="order-card-customer">{order.customer}</div>
                  <div className="order-card-po">
                    {[order.order_number, order.po_number && `PO ${order.po_number}`].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <PriorityBadge priority={order.priority} />
              </div>
              <div className="order-card-bottom">
                <div className="order-card-status">
                  <span className={`status-badge ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                  {isOverdue && <span className="overdue-tag">⚠ OVERDUE</span>}
                </div>
                <div className="order-card-meta">
                  <span className={`cell-date ${isOverdue ? 'cell-date-overdue' : ''}`}>
                    {new Date(order.readiness_date + 'T00:00:00').toLocaleDateString()}
                  </span>
                  <span className="order-card-qty">{kg(order.quantity)}</span>
                  <span className="order-card-value">{currency(order.order_value)}</span>
                </div>
              </div>

              {isOpen && (
                <div className="order-card-detail" onClick={(e) => e.stopPropagation()}>
                  <OrderDetail order={order} auditCache={auditCache} loadingAudit={loadingAudit} />
                  {role === 'owner' && (
                    <div className="order-card-owner-actions">
                      <button className="btn-secondary" onClick={() => onEdit(order)}>
                        <Pencil size={14} /> Edit Order
                      </button>
                      {order.status !== 'cancelled' && (
                        <button className="btn-secondary btn-danger-outline" onClick={() => onCancel(order.id, order.status)}>
                          <Ban size={14} /> Cancel Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="order-table">
        <thead>
          <tr>
            <th className="col-expand" />
            <th>Priority</th>
            <th>Order No.</th>
            <th>Item</th>
            <th>Customer</th>
            <th className="col-num">Qty</th>
            <th className="col-num">Cost</th>
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
                    <PriorityBadge priority={order.priority} />
                  </td>
                  <td className="cell-po" data-label="Order No.">{order.order_number || '—'}</td>
                  <td className="cell-item" data-label="Item">
                    {order.item}
                    {isOverdue && <span className="overdue-tag">OVERDUE</span>}
                  </td>
                  <td data-label="Customer">{order.customer}</td>
                  <td className="col-num" data-label="Qty">{kg(order.quantity)}</td>
                  <td className="col-num" data-label="Cost">{currency(order.order_value)}</td>
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
                      <button className="btn-icon-sm" onClick={() => onEdit(order)} title="Edit order">
                        <Pencil size={13} />
                      </button>
                    </td>
                  )}
                </tr>

                {expanded === order.id && (
                  <tr className="detail-row">
                    <td colSpan={colSpan}>
                      <OrderDetail order={order} auditCache={auditCache} loadingAudit={loadingAudit} />
                      {role === 'owner' && order.status !== 'cancelled' && (
                        <div className="detail-owner-actions">
                          <button className="btn-secondary btn-danger-outline" onClick={() => onCancel(order.id, order.status)}>
                            <Ban size={14} /> Cancel Order
                          </button>
                        </div>
                      )}
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
