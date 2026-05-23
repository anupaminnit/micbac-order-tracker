import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { createOrder } from '../lib/supabase'
import '../styles/OrderForm.css'

const INITIAL = {
  item: '',
  quantity: '',
  customer: '',
  packaging: 'box',
  branding: 'unbranded',
  readiness_date: '',
  notes: '',
}

export default function OrderForm({ user, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    try {
      await createOrder({ ...form, quantity: parseInt(form.quantity, 10) }, user.username)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

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
          <h2 id="form-title">New Order</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
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
              <label htmlFor="customer">Customer *</label>
              <input
                id="customer"
                name="customer"
                type="text"
                value={form.customer}
                onChange={handleChange}
                placeholder="e.g. Acme Corp"
                required
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
                min={today}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="packaging">Packaging</label>
              <select id="packaging" name="packaging" value={form.packaging} onChange={handleChange}>
                <option value="box">Box</option>
                <option value="bag">Bag</option>
                <option value="bulk">Bulk</option>
                <option value="pallet">Pallet</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="branding">Branding</label>
              <select id="branding" name="branding" value={form.branding} onChange={handleChange}>
                <option value="unbranded">Unbranded</option>
                <option value="branded">Branded</option>
                <option value="custom">Custom Branding</option>
              </select>
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
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Save size={16} />
              {loading ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
