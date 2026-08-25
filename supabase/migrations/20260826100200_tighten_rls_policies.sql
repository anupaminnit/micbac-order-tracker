-- Replaces the wide-open "allow_all_*" policies (USING (true) WITH CHECK (true)) on orders
-- and audit_trail with real, role-aware access control. Until this migration, the Supabase
-- anon key being public (as it must be, in any client-side app) meant anyone could read or
-- write all orders/audit data without ever signing in.
--
-- Note: this intentionally does NOT add any anon/public policy for the Factory route.
-- FactoryDashboard.jsx's updateOrderStatus() calls will fail (RLS denial) until Phase 5
-- deliberately scopes a narrow anon policy for it. That is expected during this phase,
-- not a regression to chase down.

DROP POLICY IF EXISTS "allow_all_orders" ON public.orders;
DROP POLICY IF EXISTS "allow_all_audit" ON public.audit_trail;
DROP POLICY IF EXISTS "allow_all_logistics" ON public.logistics;
DROP POLICY IF EXISTS "allow_all_logistics_documents" ON public.logistics_documents;

-- orders: any signed-in user (owner or admin) can view; only owner can create or change one.
CREATE POLICY "orders_select_authenticated" ON public.orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "orders_insert_owner" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

CREATE POLICY "orders_update_owner" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

-- audit_trail: any signed-in user can view; rows are only ever inserted by app code
-- alongside an owner-made order change (see stamp_changed_by trigger).
CREATE POLICY "audit_trail_select_authenticated" ON public.audit_trail
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_trail_insert_owner" ON public.audit_trail
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

-- logistics / logistics_documents: authenticated-only for now. This closes the anonymous
-- public-access gap, which was the most severe part of the exposure. Whether Admin should
-- be able to edit these (vs. view-only, matching Orders) is an open product question,
-- explicitly deferred to Phase 4 rather than decided here.
CREATE POLICY "logistics_all_authenticated" ON public.logistics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "logistics_documents_all_authenticated" ON public.logistics_documents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
