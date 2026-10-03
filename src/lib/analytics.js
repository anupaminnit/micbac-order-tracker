import { supabase } from './supabase'
import { localDateStr } from './dates'
import { orderProfit } from './profit'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function lastNMonths(n, now) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()] })
  }
  return out
}

function monthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}`
}

const sum = (xs) => xs.reduce((a, b) => a + b, 0)

// Profit totals over the orders that have BOTH prices — a missing selling price is never
// counted as $0 revenue (that would show a fake loss of the whole cost).
function profitTotals(orders) {
  const priced = orders.filter((o) => orderProfit(o) != null)
  const revenue = sum(priced.map((o) => o.selling_price))
  const cost = sum(priced.map((o) => o.order_value))
  const profit = revenue - cost
  return {
    revenue,
    cost,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : null,
    pricedCount: priced.length,
    unpricedCount: orders.length - priced.length,
  }
}

// Pure: all money/date math lives here so it can be unit-tested (analytics.test.js).
// "Revenue" = selling_price, "cost" = order_value, both total USD per order. Realised figures
// use dispatched orders only; dispatch month = the order's updated_at (last status change).
export function computeAnalytics(orders, audit, now = new Date()) {
  const dispatched = orders.filter((o) => o.status === 'dispatched')
  const active = orders.filter((o) => o.status !== 'dispatched')

  const realised = profitTotals(dispatched)

  // Monthly revenue, profit and throughput over the last 6 months
  const months = lastNMonths(6, now)
  const byMonth = Object.fromEntries(months.map((m) => [m.key, { revenue: 0, profit: 0, count: 0 }]))
  dispatched.forEach((o) => {
    const bucket = byMonth[monthKey(o.updated_at)]
    if (!bucket) return
    bucket.count += 1
    const p = orderProfit(o)
    if (p) {
      bucket.revenue += o.selling_price
      bucket.profit += p.profit
    }
  })
  // Scale by magnitude so a loss month still gets a visible (red) bar.
  const maxProfit = Math.max(...months.map((m) => Math.abs(byMonth[m.key].profit)), 1)
  const maxThroughput = Math.max(...months.map((m) => byMonth[m.key].count), 1)
  const monthlyProfit = months.map((m) => ({
    month: m.label,
    revenue: byMonth[m.key].revenue,
    profit: byMonth[m.key].profit,
    pct: (Math.abs(byMonth[m.key].profit) / maxProfit) * 100,
  }))
  const factoryThroughput = months.map((m) => ({
    month: m.label,
    count: byMonth[m.key].count,
    pct: (byMonth[m.key].count / maxThroughput) * 100,
  }))

  const thisMonthProfit = monthlyProfit[monthlyProfit.length - 1].profit
  const lastMonthProfit = monthlyProfit[monthlyProfit.length - 2].profit
  // vs a loss/zero month a % change is meaningless, so report none rather than a misleading one
  const profitGrowth =
    lastMonthProfit > 0 ? Math.round(((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100) : null

  // On-time rate: dispatched on/before readiness_date (local calendar date, not UTC —
  // see src/lib/dates.js for why that distinction matters here)
  const onTimeCount = dispatched.filter((o) => localDateStr(new Date(o.updated_at)) <= o.readiness_date).length
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
    ? Math.round((sum(productionDurations) / productionDurations.length) * 10) / 10
    : 0

  // Top customers by gross profit, across all (non-cancelled) orders with both prices —
  // booked profit, not just dispatched, so new customers show up before their first shipment.
  const byCustomer = {}
  orders.forEach((o) => {
    const p = orderProfit(o)
    if (!p) return
    if (!byCustomer[o.customer]) byCustomer[o.customer] = { profit: 0, revenue: 0, orders: 0 }
    byCustomer[o.customer].profit += p.profit
    byCustomer[o.customer].revenue += o.selling_price
    byCustomer[o.customer].orders += 1
  })
  const maxCustomerProfit = Math.max(...Object.values(byCustomer).map((c) => Math.abs(c.profit)), 1)
  const topCustomers = Object.entries(byCustomer)
    .map(([name, v]) => ({
      name,
      ...v,
      margin: v.revenue > 0 ? (v.profit / v.revenue) * 100 : null,
      pct: (Math.abs(v.profit) / maxCustomerProfit) * 100,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 4)

  const statusCounts = { pending: 0, production: 0, ready: 0, dispatched: 0 }
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  })

  const pipeline = profitTotals(active)

  return {
    realised,
    profitGrowth,
    onTimeRate,
    avgProductionDays,
    pipeline,
    activeCount: active.length,
    monthlyProfit,
    factoryThroughput,
    topCustomers,
    statusCounts,
    totalOrders: orders.length,
  }
}

export async function getAnalyticsSummary() {
  const [{ data: orders, error: ordersError }, { data: audit, error: auditError }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, customer, status, order_value, selling_price, readiness_date, created_at, updated_at')
      .neq('status', 'cancelled'),
    supabase.from('audit_trail').select('order_id, action, changed_at'),
  ])
  if (ordersError) throw ordersError
  if (auditError) throw auditError
  return computeAnalytics(orders, audit)
}
