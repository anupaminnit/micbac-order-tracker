import { createClient } from '@supabase/supabase-js'

// Schema source of truth: supabase/migrations/ (applied via `supabase db push`).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export async function getOrders({ status, priority, search, dateFrom, dateTo } = {}) {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (search) query = query.or(`item.ilike.%${search}%,customer.ilike.%${search}%`)
  if (dateFrom) query = query.gte('readiness_date', dateFrom)
  if (dateTo) query = query.lte('readiness_date', dateTo)

  const { data, error } = await query
  if (error) throw error
  return data
}

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

export async function updateOrderStatus(orderId, newStatus, changedBy, currentStatus, notes = '') {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) throw error

  const actionMap = {
    production: 'Started Production',
    ready: 'Marked Ready',
    dispatched: 'Dispatched',
  }

  await supabase.from('audit_trail').insert({
    order_id: orderId,
    action: actionMap[newStatus] || `Status → ${newStatus}`,
    old_status: currentStatus,
    new_status: newStatus,
    changed_by: changedBy,
    notes: notes || null,
  })

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
  if (error) throw error

  const today = new Date().toISOString().split('T')[0]
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
    'ID', 'Item', 'Quantity', 'Customer', 'Packaging',
    'Branding', 'Readiness Date', 'Status', 'Created By', 'Created At',
  ]
  const rows = orders.map((o) => [
    o.id, o.item, o.quantity, o.customer, o.packaging,
    o.branding, o.readiness_date, o.status, o.created_by,
    new Date(o.created_at).toLocaleDateString(),
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
