-- Factory now owns the last milestone too: "Loaded in trucks & dispatched" (ready -> dispatched).
-- The owner's Dispatch button is removed in the UI. Widens the Phase 5 anon policies
-- (20260828100000) by exactly one step; the status-transition trigger already allows
-- ready -> dispatched, and the column-level grant (status, updated_at only) is unchanged.

DROP POLICY "factory_select_active_orders" ON public.orders;
CREATE POLICY "factory_select_active_orders" ON public.orders
  FOR SELECT TO anon USING (status IN ('pending', 'production', 'ready'));

DROP POLICY "factory_update_active_orders" ON public.orders;
CREATE POLICY "factory_update_active_orders" ON public.orders
  FOR UPDATE TO anon
  USING (status IN ('pending', 'production', 'ready'))
  WITH CHECK (status IN ('production', 'ready', 'dispatched'));

DROP POLICY "factory_insert_audit_trail" ON public.audit_trail;
CREATE POLICY "factory_insert_audit_trail" ON public.audit_trail
  FOR INSERT TO anon
  WITH CHECK (
    (action = 'Started Production' AND old_status = 'pending' AND new_status = 'production')
    OR (action = 'Marked Ready' AND old_status = 'production' AND new_status = 'ready')
    OR (action = 'Dispatched' AND old_status = 'ready' AND new_status = 'dispatched')
  );
