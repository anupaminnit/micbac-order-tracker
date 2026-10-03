import { describe, it, expect, vi } from 'vitest'

// analytics.js imports the Supabase client at module load; the pure function never touches it.
vi.mock('./supabase', () => ({ supabase: {} }))

const { computeAnalytics } = await import('./analytics')
const { orderProfit } = await import('./profit')

const NOW = new Date(2026, 9, 15) // 15 Oct 2026, local time

function order(overrides) {
  return {
    id: Math.random().toString(36).slice(2),
    customer: 'ACME',
    status: 'dispatched',
    order_value: 1000,
    selling_price: 1200,
    readiness_date: '2026-10-20',
    created_at: '2026-10-01T10:00:00',
    updated_at: '2026-10-10T10:00:00',
    ...overrides,
  }
}

describe('orderProfit', () => {
  it('is selling price minus cost, with margin on selling price', () => {
    expect(orderProfit({ order_value: 1000, selling_price: 1250 })).toEqual({ profit: 250, margin: 20 })
  })

  it('reports a loss as negative profit', () => {
    expect(orderProfit({ order_value: 1000, selling_price: 800 })).toEqual({ profit: -200, margin: -25 })
  })

  it('is null when either price is missing — never treats missing as $0', () => {
    expect(orderProfit({ order_value: 1000, selling_price: null })).toBeNull()
    expect(orderProfit({ order_value: null, selling_price: 1000 })).toBeNull()
    expect(orderProfit({ order_value: undefined, selling_price: 1000 })).toBeNull()
  })

  it('handles a zero cost (all profit) and a zero selling price (no margin)', () => {
    expect(orderProfit({ order_value: 0, selling_price: 500 })).toEqual({ profit: 500, margin: 100 })
    expect(orderProfit({ order_value: 100, selling_price: 0 })).toEqual({ profit: -100, margin: null })
  })
})

describe('computeAnalytics', () => {
  it('realised profit uses dispatched orders with both prices only', () => {
    const r = computeAnalytics(
      [
        order({ order_value: 1000, selling_price: 1200 }),
        order({ order_value: 2000, selling_price: 2600 }),
        order({ order_value: 5000, selling_price: null }), // dispatched, unpriced
        order({ status: 'production', order_value: 9000, selling_price: 9999 }), // not realised
      ],
      [],
      NOW,
    )
    expect(r.realised).toEqual({
      revenue: 3800,
      cost: 3000,
      profit: 800,
      margin: (800 / 3800) * 100,
      pricedCount: 2,
      unpricedCount: 1,
    })
  })

  it('pipeline covers non-dispatched orders', () => {
    const r = computeAnalytics(
      [
        order({ status: 'pending', order_value: 100, selling_price: 150 }),
        order({ status: 'ready', order_value: 200, selling_price: null }),
        order({ status: 'dispatched' }),
      ],
      [],
      NOW,
    )
    expect(r.activeCount).toBe(2)
    expect(r.pipeline.revenue).toBe(150)
    expect(r.pipeline.profit).toBe(50)
    expect(r.pipeline.unpricedCount).toBe(1)
  })

  it('margin is null when nothing is priced', () => {
    const r = computeAnalytics([order({ selling_price: null })], [], NOW)
    expect(r.realised.profit).toBe(0)
    expect(r.realised.margin).toBeNull()
  })

  it('buckets monthly profit by dispatch month and ignores months outside the window', () => {
    const r = computeAnalytics(
      [
        order({ updated_at: '2026-10-02T10:00:00', order_value: 100, selling_price: 300 }), // Oct +200
        order({ updated_at: '2026-09-20T10:00:00', order_value: 100, selling_price: 200 }), // Sep +100
        order({ updated_at: '2026-09-21T10:00:00', order_value: 500, selling_price: 400 }), // Sep -100
        order({ updated_at: '2026-03-01T10:00:00', order_value: 1, selling_price: 999 }), // too old
      ],
      [],
      NOW,
    )
    expect(r.monthlyProfit.map((m) => m.month)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'])
    const oct = r.monthlyProfit[5]
    const sep = r.monthlyProfit[4]
    expect(oct).toMatchObject({ profit: 200, revenue: 300, pct: 100 })
    expect(sep).toMatchObject({ profit: 0, revenue: 600 })
    expect(r.factoryThroughput[4].count).toBe(2)
  })

  it('gives a loss month a bar sized by magnitude', () => {
    const r = computeAnalytics(
      [
        order({ updated_at: '2026-10-02T10:00:00', order_value: 100, selling_price: 200 }), // +100
        order({ updated_at: '2026-09-02T10:00:00', order_value: 400, selling_price: 200 }), // -200
      ],
      [],
      NOW,
    )
    expect(r.monthlyProfit[4]).toMatchObject({ profit: -200, pct: 100 })
    expect(r.monthlyProfit[5]).toMatchObject({ profit: 100, pct: 50 })
  })

  it('profit growth vs last month, and none when last month was zero or a loss', () => {
    const grow = computeAnalytics(
      [
        order({ updated_at: '2026-10-02T10:00:00', order_value: 0, selling_price: 150 }),
        order({ updated_at: '2026-09-02T10:00:00', order_value: 0, selling_price: 100 }),
      ],
      [],
      NOW,
    )
    expect(grow.profitGrowth).toBe(50)

    const fromLoss = computeAnalytics(
      [
        order({ updated_at: '2026-10-02T10:00:00', order_value: 0, selling_price: 150 }),
        order({ updated_at: '2026-09-02T10:00:00', order_value: 200, selling_price: 100 }),
      ],
      [],
      NOW,
    )
    expect(fromLoss.profitGrowth).toBeNull()
    expect(computeAnalytics([], [], NOW).profitGrowth).toBeNull()
  })

  it('ranks top customers by booked profit across all statuses, max 4', () => {
    const r = computeAnalytics(
      [
        order({ customer: 'A', order_value: 100, selling_price: 200 }), // 100
        order({ customer: 'A', status: 'pending', order_value: 100, selling_price: 150 }), // +50
        order({ customer: 'B', order_value: 100, selling_price: 400 }), // 300
        order({ customer: 'C', order_value: 100, selling_price: 110 }), // 10
        order({ customer: 'D', order_value: 100, selling_price: 90 }), // -10
        order({ customer: 'E', order_value: 100, selling_price: 120 }), // 20
        order({ customer: 'F', order_value: 100, selling_price: null }), // unpriced: excluded
      ],
      [],
      NOW,
    )
    expect(r.topCustomers.map((c) => c.name)).toEqual(['B', 'A', 'E', 'C'])
    expect(r.topCustomers[1]).toMatchObject({ profit: 150, revenue: 350, orders: 2 })
    expect(r.topCustomers[0].pct).toBe(100)
  })

  it('on-time rate compares local dispatch date to readiness date', () => {
    const r = computeAnalytics(
      [
        order({ readiness_date: '2026-10-10', updated_at: '2026-10-10T23:30:00' }), // same day: on time
        order({ readiness_date: '2026-10-10', updated_at: '2026-10-11T00:30:00' }), // late
      ],
      [],
      NOW,
    )
    expect(r.onTimeRate).toBe(50)
  })

  it('averages production days from audit trail start -> ready', () => {
    const audit = [
      { order_id: 'x', action: 'Started Production', changed_at: '2026-10-01T00:00:00Z' },
      { order_id: 'x', action: 'Marked Ready', changed_at: '2026-10-04T00:00:00Z' },
      { order_id: 'y', action: 'Started Production', changed_at: '2026-10-01T00:00:00Z' },
      { order_id: 'y', action: 'Marked Ready', changed_at: '2026-10-02T00:00:00Z' },
      { order_id: 'z', action: 'Started Production', changed_at: '2026-10-01T00:00:00Z' }, // not ready yet
    ]
    expect(computeAnalytics([], audit, NOW).avgProductionDays).toBe(2)
  })
})
