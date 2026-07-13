import { useState } from 'react'
import { ChevronDown, ChevronRight, Package, Truck, ShieldCheck, FileText } from 'lucide-react'
import {
  getOrCreateLogistics,
  updateLogistics,
  markDelivered,
  getLogisticsDocuments,
  addLogisticsDocument,
} from '../lib/logistics'
import '../styles/Logistics.css'

const OVERALL_LABEL = {
  pending: 'Pending',
  in_transit: 'In Transit',
  action_needed: 'Action Needed',
  delivered: 'Delivered',
}
const OVERALL_CLASS = {
  pending: 'chip-pending',
  in_transit: 'chip-progress',
  action_needed: 'chip-issue',
  delivered: 'chip-done',
}

const DOC_TYPES = ['invoice', 'packing_list', 'bl', 'coa', 'inspection_report']

const currency = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function vehicleStatus(l) {
  if (l.transporter && l.vehicle_number) return 'done'
  if (l.transporter || l.vehicle_number) return 'progress'
  return 'pending'
}
function containerStatus(l) {
  if (l.container_number && l.shipping_line) return 'done'
  if (l.container_number || l.shipping_line) return 'progress'
  return 'pending'
}
function customsStepStatus(l) {
  if (l.customs_status === 'cleared') return 'done'
  if (l.customs_status === 'filed') return 'progress'
  return 'pending'
}
function deliveryStepStatus(l) {
  if (l.overall_status === 'delivered') return 'done'
  if (l.overall_status === 'action_needed') return 'issue'
  if (l.overall_status === 'in_transit') return 'progress'
  return 'pending'
}

const STEP_CLASS = { done: 'chip-done', progress: 'chip-progress', issue: 'chip-issue', pending: 'chip-pending' }

export default function LogisticsCard({ order, logistics, docCount, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const [current, setCurrent] = useState(logistics)
  const [form, setForm] = useState(logistics || {})
  const [docs, setDocs] = useState(null)
  const [newDoc, setNewDoc] = useState({ doc_type: DOC_TYPES[0], file_url: '' })
  const [loadingPanel, setLoadingPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const effective = current || {
    container_number: null,
    shipping_line: null,
    transporter: null,
    vehicle_number: null,
    customs_status: 'not_filed',
    overall_status: 'pending',
  }

  const steps = [
    { key: 'vehicle', icon: '🚛', label: 'Vehicle', status: vehicleStatus(effective) },
    { key: 'container', icon: '📦', label: 'Container', status: containerStatus(effective) },
    { key: 'customs', icon: '🛃', label: 'Customs', status: customsStepStatus(effective) },
    { key: 'delivery', icon: '✓', label: 'Delivery', status: deliveryStepStatus(effective) },
  ]
  const doneCount = steps.filter((s) => s.status === 'done').length
  const progressPct = (doneCount / 4) * 100

  const toggleExpand = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    let row = current
    if (!row) {
      setLoadingPanel(true)
      try {
        row = await getOrCreateLogistics(order.id)
        setCurrent(row)
        setForm(row)
      } catch (err) {
        setError(err.message)
        setLoadingPanel(false)
        return
      }
      setLoadingPanel(false)
    }
    if (!docs && row) {
      try {
        setDocs(await getLogisticsDocuments(row.id))
      } catch (err) {
        setError(err.message)
      }
    }
  }

  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateLogistics(current.id, form)
      setCurrent(updated)
      setForm(updated)
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkDelivered = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await markDelivered(current.id)
      setCurrent(updated)
      setForm(updated)
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddDoc = async () => {
    if (!newDoc.file_url.trim()) return
    setSaving(true)
    setError(null)
    try {
      const doc = await addLogisticsDocument(current.id, newDoc.doc_type, newDoc.file_url.trim())
      setDocs((d) => [doc, ...(d || [])])
      setNewDoc({ doc_type: DOC_TYPES[0], file_url: '' })
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="logistics-card">
      <div className="logistics-card-header">
        <div className="logistics-card-top">
          <div>
            <div className="logistics-item">{order.item}</div>
            <div className="logistics-meta">
              {order.customer} · {order.po_number || '—'} · {order.quantity.toLocaleString()} · {currency(order.order_value)}
            </div>
            <div className="logistics-dispatched">
              Dispatched {new Date(order.updated_at).toLocaleDateString()}
            </div>
          </div>
          <span className={`status-chip ${OVERALL_CLASS[effective.overall_status]}`}>
            {OVERALL_LABEL[effective.overall_status]}
          </span>
        </div>

        <div className="step-chips">
          {steps.map((s) => (
            <span key={s.key} className={`step-chip ${STEP_CLASS[s.status]}`}>
              {s.icon} {s.label}
            </span>
          ))}
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <button className="btn-secondary btn-toggle" onClick={toggleExpand}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {expanded ? 'Hide Details' : 'View / Edit Logistics'}
        </button>
      </div>

      {expanded && (
        <div className="logistics-detail">
          {error && (
            <div className="error-banner">
              {error}
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {loadingPanel || !current ? (
            <div className="loading-state">Loading…</div>
          ) : (
            <>
              <div className="logistics-detail-grid">
                <div className="detail-panel-box">
                  <div className="detail-panel-header">
                    <Package size={13} /> Container
                  </div>
                  <label>
                    Container No.
                    <input name="container_number" value={form.container_number || ''} onChange={handleFieldChange} />
                  </label>
                  <label>
                    Shipping Line
                    <input name="shipping_line" value={form.shipping_line || ''} onChange={handleFieldChange} />
                  </label>
                  <label>
                    Booking Ref
                    <input name="booking_ref" value={form.booking_ref || ''} onChange={handleFieldChange} />
                  </label>
                  <div className="field-row">
                    <label>
                      ETD
                      <input type="date" name="etd" value={form.etd || ''} onChange={handleFieldChange} />
                    </label>
                    <label>
                      ETA
                      <input type="date" name="eta" value={form.eta || ''} onChange={handleFieldChange} />
                    </label>
                  </div>
                </div>

                <div className="detail-panel-box">
                  <div className="detail-panel-header">
                    <Truck size={13} /> Vehicle
                  </div>
                  <label>
                    Transporter
                    <input name="transporter" value={form.transporter || ''} onChange={handleFieldChange} />
                  </label>
                  <label>
                    Vehicle No.
                    <input name="vehicle_number" value={form.vehicle_number || ''} onChange={handleFieldChange} />
                  </label>
                  <label>
                    Pickup Date
                    <input type="date" name="pickup_date" value={form.pickup_date || ''} onChange={handleFieldChange} />
                  </label>
                </div>

                <div className="detail-panel-box">
                  <div className="detail-panel-header">
                    <ShieldCheck size={13} /> Customs
                  </div>
                  <label>
                    SB Number
                    <input name="sb_number" value={form.sb_number || ''} onChange={handleFieldChange} />
                  </label>
                  <label>
                    Filing Date
                    <input
                      type="date"
                      name="customs_filing_date"
                      value={form.customs_filing_date || ''}
                      onChange={handleFieldChange}
                    />
                  </label>
                  <label>
                    Status
                    <select name="customs_status" value={form.customs_status} onChange={handleFieldChange}>
                      <option value="not_filed">Not Filed</option>
                      <option value="filed">Filed</option>
                      <option value="cleared">Cleared</option>
                    </select>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="drawback_claimed"
                      checked={!!form.drawback_claimed}
                      onChange={handleFieldChange}
                    />
                    Drawback Claimed
                  </label>
                </div>

                <div className="detail-panel-box">
                  <div className="detail-panel-header">
                    <FileText size={13} /> Documents
                  </div>
                  {docs === null ? (
                    <p className="chart-empty">Loading…</p>
                  ) : docs.length === 0 ? (
                    <p className="chart-empty">No documents yet.</p>
                  ) : (
                    <ul className="doc-list">
                      {docs.map((d) => (
                        <li key={d.id}>
                          <span className="doc-type">{d.doc_type.replace('_', ' ')}</span>
                          <a href={d.file_url} target="_blank" rel="noreferrer">
                            {d.file_url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="doc-add-row">
                    <select
                      value={newDoc.doc_type}
                      onChange={(e) => setNewDoc((d) => ({ ...d, doc_type: e.target.value }))}
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Document URL"
                      value={newDoc.file_url}
                      onChange={(e) => setNewDoc((d) => ({ ...d, file_url: e.target.value }))}
                    />
                    <button className="btn-secondary" onClick={handleAddDoc} disabled={saving}>
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="logistics-detail-footer">
                <button className="btn-secondary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Details'}
                </button>
                {effective.overall_status !== 'delivered' && (
                  <button className="btn-primary" onClick={handleMarkDelivered} disabled={saving}>
                    Mark Delivered
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
