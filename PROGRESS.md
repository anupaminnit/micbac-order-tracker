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

### Phase 3 — Logistics (done)
- Migration `supabase/migrations/20260713190625_add_logistics_tables.sql` adds `logistics`
  (FK to `orders`, container/vehicle/customs fields, `overall_status`, `delivered_at`) and
  `logistics_documents` (FK to `logistics`, `doc_type`/`file_url`) — applied via `supabase db
  push`. Same `allow_all` RLS policy posture as the existing tables (no new authorization
  regression, just consistent with today's model).
- New `src/lib/logistics.js`: `getDispatchedOrdersWithLogistics()` (batches orders + their
  logistics rows), `getOrCreateLogistics(orderId)` (lazy — only materializes a row when a card
  is actually expanded, not on page load), `updateLogistics`, `markDelivered`,
  `getLogisticsDocuments`/`addLogisticsDocument`, `getLogisticsDocumentCounts` (batched, for the
  "Documents Missing" KPI without N+1 queries).
- New `src/components/LogisticsCard.jsx` + `src/pages/Logistics.jsx` + `src/styles/Logistics.css`:
  KPI strip (Active Shipments/Container Pending/Documents Missing/Customs Cleared), one card per
  dispatched order with step-chips (Vehicle/Container/Customs/Delivery, color-coded from field
  completeness) + progress bar, expandable 2×2 Container/Vehicle/Customs/Documents panel with
  inline editing, a lightweight document-URL add form (no Supabase Storage — just a `doc_type` +
  URL reference, per plan), and "Mark Delivered".
- `/logistics` route added, same any-logged-in-user guard as `/analytics`. Nav link enabled.
- **Bug found and fixed during verification**: every save/add-doc/mark-delivered action called
  the parent's `fetchData()`, which set `loading=true` and unmounted the entire shipment list
  (including the just-expanded card's local edit state) before remounting it — so the panel you
  were editing would slam shut right after you clicked Save. Fixed by only toggling `loading` on
  the very first fetch, not on every background refresh.
- Verified the full lifecycle end-to-end: created a brand-new test order ("Logistics QA Test
  Item" / QA Logistics Corp), advanced it pending → production → ready via the Factory view,
  dispatched it as Owner, then on `/logistics` expanded the card, filled in container/vehicle/
  customs fields, saved (confirmed panel stays open — the bug above), added a document, and
  clicked Mark Delivered (confirmed status chip → Delivered, Active Shipments KPI → 0, all step
  chips → done). Zero console errors throughout. This is new data I created and drove through
  the app myself — no pre-existing order was touched (dispatching one of the real orders was
  correctly blocked earlier in Phase 2 and I didn't attempt to work around that here either).
- Two test records now sit in the live DB from verification across phases: "Test Widget XL"
  (Phase 1, still pending) and "Logistics QA Test Item" (Phase 3, now delivered with logistics
  data). Left in place per your instruction to keep things as-is for now.

### Phase 4 — Theme (done)
- New `src/contexts/ThemeContext.jsx`: reads `localStorage['micbac-theme']`, falls back to
  `prefers-color-scheme`, sets `document.documentElement.dataset.theme`, persists on toggle.
  Wraps `<App/>` in `main.jsx`.
- `App.css`: added `[data-theme='dark']` block redefining the existing `:root` tokens
  (`--bg`/`--surface`/`--border`/`--border-dark`/`--text`/`--text-muted`/`--text-light`/
  `--shadow*`) plus new semantic-text/border tokens (`--success-text`, `--warning-text`,
  `--danger-text`, `--info-text`, `--success-border`, `--warning-border`, `--danger-border`,
  `--info-border`, `--neutral-bg`, `--low-text`).
- **Correction to the plan's "zero per-file edits" assumption**: that held for layout tokens
  (bg/surface/border/text), but several status-color classes across `App.css` (badges),
  `AdminPanel.css` (stat boxes), `OrderTable.css` (priority badges, overdue row, audit
  transition), `Logistics.css` (step chips, KPI tint cards), and `Analytics.css` (on-time-rate
  KPI) had hardcoded hex text colors paired with the `*-bg` vars — those pairs would've gone
  illegible against a dark surface (dark text on a translucent dark tint). Converted all of them
  to the new semantic tokens so the dark override actually reaches every status color, not just
  page chrome. `FactoryDashboard.css` stays fully exempt, as planned — it doesn't use the token
  system at all and remains permanently dark.
- Toggle control (sun/moon icon) added to `TopNav`, next to Logout.
- Verified: toggled dark on `/owner`, confirmed Orders/Analytics/Logistics all flip instantly
  with legible status/priority/chip colors in both themes; reloaded and confirmed the choice
  persisted via `localStorage`; opened `/factory` with dark mode active elsewhere and confirmed
  it stays its own permanently-dark navy, unaffected by the toggle. Zero console errors.

## Redesign complete
All 4 phases of the Claude Design handoff are now built and verified against the live Supabase
project. Test data created during verification ("Test Widget XL", "Logistics QA Test Item") is
still in the live DB — left in place per your instruction. Not yet deployed to GitHub Pages
(`anupaminnit.github.io/micbac-order-tracker` still serves the old pre-redesign build) — that
needs a separate explicit go-ahead before running `npm run deploy`, per the "ask before
publishing" rule.
