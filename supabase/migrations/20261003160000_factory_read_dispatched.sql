-- Factory gets a read-only "Completed" tab, so anon may now SELECT dispatched orders too.
-- Writes are unchanged: factory_update_active_orders still only matches pending/production/ready
-- rows, so a dispatched order can't be modified from the Factory. Cancelled stays hidden.
DROP POLICY "factory_select_active_orders" ON public.orders;
CREATE POLICY "factory_select_active_orders" ON public.orders
  FOR SELECT TO anon USING (status IN ('pending', 'production', 'ready', 'dispatched'));
