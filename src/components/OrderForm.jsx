import { useEffect, useState } from 'react'
import { X, Save, Paperclip } from 'lucide-react'
import { createOrder, updateOrder } from '../lib/supabase'
import { localDateStr } from '../lib/dates'
import { getCustomers, addCustomer, normalizeCustomerName } from '../lib/customers'
import BrandingPicker from './BrandingPicker'
import '../styles/OrderForm.css'

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', emoji: '🔴' },
  { value: 'high', label: 'High', emoji: '🟠' },
  { value: 'normal', label: 'Normal', emoji: '🔵' },
  { value: 'low', label: 'Low', emoji: '⚪' },
]

const INITIAL = {
  item: '',
  quantity: '',
  customer: '',
  po_number: '',
  order_value: '',
  priority: 'normal',
  packaging: 'box',
  packing_type: '',
  branding: 'Default',
  readiness_date: '',
  delivery_address: '',
  notes: '',
}

function toFormState(order) {
  return {
    item: order.item ?? '',
    quantity: order.quantity != null ? String(order.quantity) : '',
    customer: order.customer ?? '',
    po_number: order.po_number ?? '',
    order_value: order.order_value != null ? String(order.order_value) : '',
    priority: order.priority ?? 'normal',
    packaging: order.packaging ?? 'box',
    packing_type: order.packing_type ?? '',
    branding: order.branding ?? 'Default',
    readiness_date: order.readiness_date ?? '',
    delivery_address: order.delivery_address ?? '',
    notes: order.notes ?? '',
  }
}

export default function OrderForm({ user, order, onClose, onSuccess }) {
  const isEdit = !!order
  const [form, setForm] = useState(() => (isEdit ? toFormState(order) : INITIAL))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    getCustomers()
      .then(setCustomers)
      .catch((err) => console.error('Failed to load customers:', err))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.item.trim() || !form.quantity || !form.customer.trim() || !form.readiness_date) {
      setError('Please fill in all required fields.')
      return
    }
    setLoading(true)
    setError('')
    const customer = normalizeCustomerName(form.customer)
    const payload = {
      ...form,
      customer,
      quantity: parseInt(form.quantity, 10),
      order_value: form.order_value ? parseFloat(form.order_value) : null,
      po_number: form.po_number || null,
      packing_type: form.packing_type || null,
      delivery_address: form.delivery_address || null,
    }
    try {
      if (isEdit) {
        await updateOrder(order.id, payload, user.username)
      } else {
        await createOrder(payload, user.username)
      }
      // Remember a newly typed customer for next time. Best-effort: the order is already saved,
      // so a failure here shouldn't surface as an order error.
      const known = customers.some((c) => c.name.toLowerCase() === customer.toLowerCase())
      if (!known) {
        try {
          await addCustomer(customer)
        } catch (err) {
          console.error('Failed to save new customer:', err)
        }
      }
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = localDateStr()

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="form-title">{isEdit ? 'Edit Order' : 'New Order'}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="priority-grid">
            {PRIORITIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                className={`priority-card priority-${value} ${form.priority === value ? 'priority-selected' : ''}`}
                onClick={() => setForm((f) => ({ ...f, priority: value }))}
              >
                <span className="priority-emoji">{emoji}</span>
                {label}
              </button>
            ))}
          </div>

          <div className="form-grid">
            <div className="form-group form-group-full">
              <label htmlFor="item">Item / Product *</label>
              <input
                id="item"
                name="item"
                type="text"
                value={form.item}
                onChange={handleChange}
                placeholder="e.g. Steel Rods 10mm"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="customer">Customer *</label>
              <input
                id="customer"
                name="customer"
                type="text"
                value={form.customer}
                onChange={handleChange}
                placeholder="Pick from list or type a new one"
                list="customer-options"
                autoComplete="off"
                required
              />
              <datalist id="customer-options">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label htmlFor="po_number">PO Number</label>
              <input
                id="po_number"
                name="po_number"
                type="text"
                value={form.po_number}
                onChange={handleChange}
                placeholder="e.g. PO-10234"
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity *</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                placeholder="e.g. 500"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="order_value">Order Value (USD)</label>
              <input
                id="order_value"
                name="order_value"
                type="number"
                value={form.order_value}
                onChange={handleChange}
                placeholder="e.g. 12000"
                min="0"
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label htmlFor="readiness_date">Readiness Date *</label>
              <input
                id="readiness_date"
                name="readiness_date"
                type="date"
                value={form.readiness_date}
                onChange={handleChange}
                min={isEdit ? undefined : today}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="packing_type">Packing Type</label>
              <input
                id="packing_type"
                name="packing_type"
                type="text"
                value={form.packing_type}
                onChange={handleChange}
                placeholder="e.g. 25kg bags on pallet"
              />
            </div>

            <div className="form-group">
              <label htmlFor="packaging">Packaging</label>
              <select id="packaging" name="packaging" value={form.packaging} onChange={handleChange}>
                <option value="box">Box</option>
                <option value="bag">Bag</option>
                <option value="bulk">Bulk</option>
                <option value="pallet">Pallet</option>
                <option value="drum">Drum</option>
                <option value="jumbo_bag">Jumbo Bag</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-group form-group-full">
              <label>Branding</label>
              <BrandingPicker value={form.branding} onChange={(label) => setForm((f) => ({ ...f, branding: label }))} />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="delivery_address">Delivery Address</label>
              <input
                id="delivery_address"
                name="delivery_address"
                type="text"
                value={form.delivery_address}
                onChange={handleChange}
                placeholder="e.g. 12 Dock Rd, Mumbai Port, India"
              />
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Special instructions, references…"
                rows={3}
              />
            </div>

            <div className="form-group form-group-full">
              <label>Attachments</label>
              <div className="attachment-dropzone">
                <Paperclip size={18} />
                <span>Drag files here or click to upload (coming soon)</span>
              </div>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={16} />
              {isEdit ? (loading ? 'Saving…' : 'Save Changes') : loading ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
