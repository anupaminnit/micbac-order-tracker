import { createClient } from '@supabase/supabase-js'

/*
  SUPABASE SQL SETUP — paste into Supabase SQL Editor and run once:

  CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    customer TEXT NOT NULL,
    packaging TEXT NOT NULL DEFAULT 'box',
    branding TEXT NOT NULL DEFAULT 'unbranded',
    readiness_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','production','ready','dispatched')),
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE audit_trail (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    changed_by TEXT NOT NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

  -- Open policies for anon key access (tighten per your auth setup)
  CREATE POLICY "allow_all_orders" ON orders FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "allow_all_audit"  ON audit_trail FOR ALL USING (true) WITH CHECK (true);
*/

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export async function getOrders({ status, search, dateFrom, dateTo } = {}) {
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
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
  const { data, error } = await supabase.from('orders').select('status')
  if (error) throw error

  const stats = { pending: 0, production: 0, ready: 0, dispatched: 0, total: 0 }
  data.forEach((o) => {
    stats[o.status] = (stats[o.status] || 0) + 1
    stats.total++
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
