// order_value is the cost price, selling_price what the customer pays — both total USD.
// Returns null unless both are known, so callers never treat a missing price as $0.
export function orderProfit(order) {
  const cost = order.order_value
  const selling = order.selling_price
  if (cost == null || selling == null) return null
  const profit = selling - cost
  return { profit, margin: selling > 0 ? (profit / selling) * 100 : null }
}
