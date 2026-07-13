# Progress

## Redesign project (in progress)

Recreating a Claude Design handoff (project "Admin feature suggestions needed") into this
codebase across 4 phases: Orders redesign, Analytics, Logistics, Theme. Full plan at
`.claude/plans/elegant-munching-cook.md` (local, not committed).

### Phase 0 — Prep (done)
- Pulled `mark-light.png` / `mark-dark.png` logo assets from the Design project into `src/assets/`.
- Decided: charts stay plain CSS/SVG, no new dependency (matches existing hand-rolled bar chart
  in `AdminPanel.jsx`, keeps the zero-dep posture).
- Ran `supabase init` + `supabase link --project-ref nutkiyuibkxpiyrzutsa` to introduce
  `supabase/migrations/` as the schema source of truth going forward (previously schema only
  existed as a SQL comment in `src/lib/supabase.js`).

### Phase 1 — Orders Redesign (done)
- Migration `supabase/migrations/20260713154114_add_order_priority_fields.sql` adds
  `priority`/`po_number`/`order_value`/`packing_type`/`delivery_address` to `orders` — applied
  to the live project via `supabase db push`. `src/lib/supabase.js`'s schema comment shrunk to
  a pointer at the migrations dir.
- Extracted `src/components/TopNav.jsx` + `src/styles/TopNav.css` from the duplicated headers
  in `OwnerDashboard.jsx`/`AdminPanel.jsx`. Analytics/Logistics links render disabled until
  Phases 2-3 land. Uses `mark-light.png` (not `mark-dark.png` as the handoff README implied) —
  the current header background is still the old dark navy, so the light/white mark is the one
  that's actually visible; revisit when Phase 4 reworks the header to the new light-mode surface.
- `getOrderStats()` extended with `urgent`/`overdue`/`pipelineValue`; `getOrders()` takes a
  `priority` filter. Owner dashboard stats bar now has 8 tiles (5 status tabs + Urgent filter +
  static Pipeline $ + static Overdue, only shown when > 0).
- `OrderForm.jsx`: added priority selector (4 cards), PO number, order value, packing type,
  delivery address. Attachments is a visual-only stub — no Supabase Storage wired up yet.
- `OrderTable.jsx`: reordered to the 9-column spec (Priority/PO/Item/Customer/Qty/Value/Due
  Date/Status/Actions), moved Packaging/Branding/Created By into the existing expandable detail
  panel alongside new Delivery Address/Packing Type, added overdue row highlighting. Mobile is a
  CSS-only reflow (`data-label` + breakpoint), not a duplicate card component.
- Verified end-to-end against the live Supabase project: logged in as both roles, created a real
  order with all new fields, confirmed Admin still has no Actions column/no New Order button,
  confirmed the 3 pre-existing rows (with null `order_value`/`po_number`) render fine as "—".
- One test order ("Test Widget XL" / PO-99001) was created in the live DB during verification —
  left in place, flagged here in case you want it removed.

### Phase 2 — Analytics (done)
- New `src/lib/analytics.js` (`getAnalyticsSummary()`), kept separate from `supabase.js` per
  plan. Fetches `orders` + `audit_trail` and reduces client-side: monthly revenue (last 6
  months, by dispatch month), on-time rate (dispatched on/before `readiness_date`), avg
  production days (paired "Started Production" → "Marked Ready" audit_trail timestamps per
  order), active pipeline value/count, top 4 customers by order value, status distribution.
  All divide-by-zero paths guarded (`Math.max(..., 1)`), matching `AdminPanel.jsx`'s existing
  pattern.
- New `src/pages/Analytics.jsx` + `src/styles/Analytics.css`: KPI row, monthly revenue bar
  chart, order-status donut (inline `conic-gradient`, no library), top-customers progress bars,
  factory throughput bars. Zero-value bars get a `Math.max(pct, 2)` floor so they stay visibly
  present instead of disappearing.
- `/analytics` route added to `App.jsx`, guarded like `/owner` (any logged-in user, no
  mutations happen on this page so no role restriction needed). Analytics nav link enabled in
  `TopNav`.
- Verified against live data as both roles: page renders with zero console errors even though
  the live project currently has 0 dispatched orders (all KPIs correctly show `$0`/`0%`/`0 days`
  rather than `NaN` or crashing; the one test order's $4,200 value shows up correctly in Active
  Pipeline and Top Customers).
- Did **not** dispatch a real order to test the revenue/on-time-rate math with non-zero data —
  the auto-mode permission classifier correctly blocked that (would have permanently mutated one
  of the 3 real pre-existing orders' status just for a test). Confirmed the aggregation logic by
  code review instead. Worth a manual dispatch + re-check next time you're in the app if you want
  to see the non-zero-data path.

### Phase 3 — Logistics (next)
Not started. See plan file for scope: `logistics`/`logistics_documents` migration,
`src/lib/logistics.js`, `src/pages/Logistics.jsx`, `/logistics` route, KPI strip + per-order
shipment cards with step-chips/progress bar + expandable Container/Vehicle/Customs/Documents
panels.
