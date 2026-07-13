import { supabase } from './supabase'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastNMonths(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()] })
  }
  return out
}

function monthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}`
}

export async function getAnalyticsSummary() {
  const [{ data: orders, error: ordersError }, { data: audit, error: auditError }] = await Promise.all([
    supabase.from('orders').select('id, customer, status, order_value, readiness_date, created_at, updated_at'),
    supabase.from('audit_trail').select('order_id, action, changed_at'),
  ])
  if (ordersError) throw ordersError
  if (auditError) throw auditError

  const dispatched = orders.filter((o) => o.status === 'dispatched')
  const active = orders.filter((o) => o.status !== 'dispatched')

  // Monthly revenue + factory throughput: last 6 months, based on dispatched orders' updated_at
  const months = lastNMonths(6)
  const revenueByMonth = Object.fromEntries(months.map((m) => [`${m.year}-${m.month}`, 0]))
  const throughputByMonth = Object.fromEntries(months.map((m) => [`${m.year}-${m.month}`, 0]))
  dispatched.forEach((o) => {
    const key = monthKey(o.updated_at)
    if (key in revenueByMonth) {
      revenueByMonth[key] += o.order_value ?? 0
      throughputByMonth[key] += 1
    }
  })
  const maxRevenue = Math.max(...months.map((m) => revenueByMonth[`${m.year}-${m.month}`]), 1)
  const maxThroughput = Math.max(...months.map((m) => throughputByMonth[`${m.year}-${m.month}`]), 1)
  const monthlyRevenue = months.map((m) => ({
    month: m.label,
    revenue: revenueByMonth[`${m.year}-${m.month}`],
    pct: (revenueByMonth[`${m.year}-${m.month}`] / maxRevenue) * 100,
  }))
  const factoryThroughput = months.map((m) => ({
    month: m.label,
    count: throughputByMonth[`${m.year}-${m.month}`],
    pct: (throughputByMonth[`${m.year}-${m.month}`] / maxThroughput) * 100,
  }))

  // On-time rate: dispatched on/before readiness_date
  const onTimeCount = dispatched.filter(
    (o) => o.updated_at.split('T')[0] <= o.readiness_date,
  ).length
  const onTimeRate = dispatched.length ? Math.round((onTimeCount / dispatched.length) * 100) : 0

  // Avg production days: Started Production -> Marked Ready, per order
  const byOrder = {}
  audit.forEach((entry) => {
    if (!byOrder[entry.order_id]) byOrder[entry.order_id] = {}
    if (entry.action === 'Started Production') byOrder[entry.order_id].start = entry.changed_at
    if (entry.action === 'Marked Ready') byOrder[entry.order_id].end = entry.changed_at
  })
  const productionDurations = Object.values(byOrder)
    .filter((r) => r.start && r.end)
    .map((r) => (new Date(r.end) - new Date(r.start)) / (1000 * 60 * 60 * 24))
  const avgProductionDays = productionDurations.length
    ? Math.round((productionDurations.reduce((a, b) => a + b, 0) / productionDurations.length) * 10) / 10
    : 0

  // Top customers by total order value
  const byCustomer = {}
  orders.forEach((o) => {
    if (!byCustomer[o.customer]) byCustomer[o.customer] = { value: 0, orders: 0 }
    byCustomer[o.customer].value += o.order_value ?? 0
    byCustomer[o.customer].orders += 1
  })
  const maxCustomerValue = Math.max(...Object.values(byCustomer).map((c) => c.value), 1)
  const topCustomers = Object.entries(byCustomer)
    .map(([name, v]) => ({ name, ...v, pct: (v.value / maxCustomerValue) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)

  // Status distribution
  const statusCounts = { pending: 0, production: 0, ready: 0, dispatched: 0 }
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  })

  const thisMonthRevenue = monthlyRevenue[monthlyRevenue.length - 1]?.revenue ?? 0
  const lastMonthRevenue = monthlyRevenue[monthlyRevenue.length - 2]?.revenue ?? 0
  const revenueGrowth = lastMonthRevenue
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0

  return {
    totalRevenue: dispatched.reduce((sum, o) => sum + (o.order_value ?? 0), 0),
    revenueGrowth,
    onTimeRate,
    avgProductionDays,
    activePipelineValue: active.reduce((sum, o) => sum + (o.order_value ?? 0), 0),
    activeCount: active.length,
    monthlyRevenue,
    factoryThroughput,
    topCustomers,
    statusCounts,
    totalOrders: orders.length,
  }
}
