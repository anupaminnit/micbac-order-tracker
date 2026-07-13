import { supabase } from './supabase'

export async function getDispatchedOrdersWithLogistics() {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'dispatched')
    .order('updated_at', { ascending: false })
  if (ordersError) throw ordersError
  if (orders.length === 0) return []

  const { data: logisticsRows, error: logisticsError } = await supabase
    .from('logistics')
    .select('*')
    .in(
      'order_id',
      orders.map((o) => o.id),
    )
  if (logisticsError) throw logisticsError

  const byOrderId = Object.fromEntries(logisticsRows.map((l) => [l.order_id, l]))
  return orders.map((order) => ({ order, logistics: byOrderId[order.id] || null }))
}

export async function getOrCreateLogistics(orderId) {
  const { data: existing, error: fetchError } = await supabase
    .from('logistics')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle()
  if (fetchError) throw fetchError
  if (existing) return existing

  const { data: created, error: insertError } = await supabase
    .from('logistics')
    .insert({ order_id: orderId })
    .select()
    .single()
  if (insertError) throw insertError
  return created
}

export async function updateLogistics(logisticsId, fields) {
  const { data, error } = await supabase
    .from('logistics')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', logisticsId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markDelivered(logisticsId) {
  return updateLogistics(logisticsId, {
    overall_status: 'delivered',
    delivered_at: new Date().toISOString(),
  })
}

export async function getLogisticsDocumentCounts(logisticsIds) {
  if (logisticsIds.length === 0) return {}
  const { data, error } = await supabase
    .from('logistics_documents')
    .select('logistics_id')
    .in('logistics_id', logisticsIds)
  if (error) throw error
  const counts = {}
  data.forEach((row) => {
    counts[row.logistics_id] = (counts[row.logistics_id] || 0) + 1
  })
  return counts
}

export async function getLogisticsDocuments(logisticsId) {
  const { data, error } = await supabase
    .from('logistics_documents')
    .select('*')
    .eq('logistics_id', logisticsId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addLogisticsDocument(logisticsId, docType, fileUrl) {
  const { data, error } = await supabase
    .from('logistics_documents')
    .insert({ logistics_id: logisticsId, doc_type: docType, file_url: fileUrl })
    .select()
    .single()
  if (error) throw error
  return data
}
