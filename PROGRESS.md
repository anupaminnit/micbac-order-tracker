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

### Phase 2 — Analytics (next)
Not started. See plan file for scope: `src/lib/analytics.js`, `src/pages/Analytics.jsx`,
`/analytics` route, KPI cards + monthly revenue bar + status donut + top customers + factory
throughput, all plain CSS/SVG.
