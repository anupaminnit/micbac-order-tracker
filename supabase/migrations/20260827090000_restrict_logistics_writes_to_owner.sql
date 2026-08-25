-- Phase 4: Admin stays view-only on Logistics too, matching every other screen (confirmed —
-- previously logistics/logistics_documents allowed any authenticated user to write, which was
-- inconsistent with Admin being view-only on Orders since Phase 1).
DROP POLICY IF EXISTS "logistics_all_authenticated" ON public.logistics;
DROP POLICY IF EXISTS "logistics_documents_all_authenticated" ON public.logistics_documents;

CREATE POLICY "logistics_select_authenticated" ON public.logistics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "logistics_write_owner" ON public.logistics
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

CREATE POLICY "logistics_update_owner" ON public.logistics
  FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "logistics_documents_select_authenticated" ON public.logistics_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "logistics_documents_insert_owner" ON public.logistics_documents
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());
