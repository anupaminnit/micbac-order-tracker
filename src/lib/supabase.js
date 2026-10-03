import { createClient } from '@supabase/supabase-js'
import { localDateStr } from './dates'

// Schema source of truth: supabase/migrations/ (applied via `supabase db push`).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// profiles row is the source of truth for role (owner/admin) — RLS on public.profiles only
// lets a session read its own row, so this always reflects who's actually signed in.
export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function getOrders({ status, priority, search, dateFrom, dateTo } = {}) {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

  // Cancelled orders are a soft delete — hidden unless explicitly asked for.
  if (status) query = query.eq('status', status)
  else query = query.neq('status', 'cancelled')
  if (priority) query = query.eq('priority', priority)
  if (search) query = query.or(`item.ilike.%${search}%,customer.ilike.%${search}%`)
  if (dateFrom) query = query.gte('readiness_date', dateFrom)
  if (dateTo) query = query.lte('readiness_date', dateTo)

  const { data, error } = await query
  if (error) throw error
  return data
}

// createdBy/changedBy below are only a fallback: the stamp_created_by/stamp_changed_by
// triggers overwrite them with the authenticated caller's profile email server-side.
export async function createOrder(orderData, createdBy) {
  const { data, error } = await supabase
    .from('orders')
    .insert({ ...orderData, created_by: createdBy, status: 'pending' })
    .select()
    .single()

  if (error) throw error

  await supabase.from('audit_trail').insert({
    order_id: data.id,
    action: 'Order Created',
    old_status: null,
    new_status: 'pending',
    changed_by: createdBy,
  })

  return data
}

// Edits the order's own fields (item, customer, quantity, etc.) — distinct from
// updateOrderStatus, which is for pipeline transitions. Logs a lightweight audit_trail marker
// (no field-level before/after diff) as best-effort — if that insert fails, the edit itself has
// already succeeded, so this only warns rather than throwing.
export async function updateOrder(orderId, fields, changedBy) {
  const { data, error } = await supabase.from('orders').update(fields).eq('id', orderId).select().single()
  if (error) throw error

  try {
    await supabase.from('audit_trail').insert({
      order_id: orderId,
      action: 'Order Edited',
      old_status: null,
      new_status: null,
      changed_by: changedBy,
    })
  } catch (err) {
    console.error('Failed to log order edit to audit trail:', err)
  }

  return data
}

// No .select() here on purpose: returning the row makes Postgres also check the *new* row
// against SELECT policies, and Factory (anon) can't read orders once they're dispatched — so
// a returning update would fail its own last step.
export async function updateOrderStatus(orderId, newStatus, changedBy, currentStatus, notes = '') {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw error

  const actionMap = {
    production: 'Started Production',
    ready: 'Marked Ready',
    dispatched: 'Dispatched',
    cancelled: 'Cancelled',
  }

  await supabase.from('audit_trail').insert({
    order_id: orderId,
    action: actionMap[newStatus] || `Status → ${newStatus}`,
    old_status: currentStatus,
    new_status: newStatus,
    changed_by: changedBy,
    notes: notes || null,
  })
}

// Best-effort: caller should dispatch the order regardless of whether this succeeds and
// surface a distinct (non-blocking) warning if it throws — the order's own status change
// already happened via updateOrderStatus.
export async function notifyDispatch(orderId) {
  const { data, error } = await supabase.functions.invoke('send-dispatch-notification', {
    body: { orderId },
  })
  if (error) throw error
  return data
}

export async function getAuditTrail(orderId) {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('order_id', orderId)
    .order('changed_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getOrderStats() {
  const { data, error } = await supabase
    .from('orders')
    .select('status, priority, order_value, readiness_date')
    .neq('status', 'cancelled')
  if (error) throw error

  const today = localDateStr()
  const stats = {
    pending: 0,
    production: 0,
    ready: 0,
    dispatched: 0,
    total: 0,
    urgent: 0,
    overdue: 0,
    pipelineValue: 0,
  }
  data.forEach((o) => {
    stats[o.status] = (stats[o.status] || 0) + 1
    stats.total++
    if (o.priority === 'urgent') stats.urgent++
    if (o.status !== 'dispatched') {
      stats.pipelineValue += o.order_value ?? 0
      if (o.readiness_date < today) stats.overdue++
    }
  })
  return stats
}

export function exportOrdersToCSV(orders) {
  const headers = [
    'ID', 'Order No.', 'PO No.', 'Item', 'Quantity (kg)', 'Customer', 'Destination Country',
    'Cost (USD)', 'Selling Price (USD)', 'Packaging', 'Branding', 'Readiness Date', 'Status',
    'Created By', 'Created At',
  ]
  const rows = orders.map((o) => [
    o.id, o.order_number, o.po_number, o.item, o.quantity, o.customer, o.destination_country,
    o.order_value, o.selling_price, o.packaging, o.branding, o.readiness_date, o.status,
    o.created_by, new Date(o.created_at).toLocaleDateString(),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell ?? ''}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `micbac-orders-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
