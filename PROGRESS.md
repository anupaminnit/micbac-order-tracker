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

### Phase 1 — Orders Redesign (next)
Not started yet. See plan file for scope: new `priority`/`po_number`/`order_value`/
`packing_type`/`delivery_address` columns, shared `TopNav`, 8-tile stats strip, 9-column
order table with overdue highlighting.
