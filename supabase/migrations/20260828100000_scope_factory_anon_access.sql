-- Phase 5: /factory stays "no login required" with zero identity check, as decided — this
-- migration is invisible server-side hardening, no UX change. Today, anon has NO policy at all
-- on orders/audit_trail (Phase 1 tightened both to authenticated-only), so /factory is currently
-- broken (shows no data) — this restores its access, scoped narrowly instead of the old
-- allow_all_orders/allow_all_audit blanket policies.

-- Factory only ever needs to see + advance pending/production orders.
CREATE POLICY "factory_select_active_orders" ON public.orders
  FOR SELECT TO anon USING (status IN ('pending', 'production'));

CREATE POLICY "factory_update_active_orders" ON public.orders
  FOR UPDATE TO anon
  USING (status IN ('pending', 'production'))
  WITH CHECK (status IN ('production', 'ready'));

-- Column-level grant: even a crafted anon request can only ever change status/updated_at,
-- never item/customer/order_value/etc. (RLS alone only restricts which rows, not which columns.)
REVOKE UPDATE ON public.orders FROM anon;
GRANT UPDATE (status, updated_at) ON public.orders TO anon;

-- Factory's updateOrderStatus() call also inserts an audit_trail row for the transition.
CREATE POLICY "factory_insert_audit_trail" ON public.audit_trail
  FOR INSERT TO anon
  WITH CHECK (
    action IN ('Started Production', 'Marked Ready')
    AND old_status IN ('pending', 'production')
    AND new_status IN ('production', 'ready')
  );

-- Closes what RLS above can't express on its own: USING/WITH CHECK check OLD and NEW status
-- independently, so e.g. a crafted request could otherwise jump pending straight to ready,
-- skipping production. This enforces the exact state machine for every writer (owner's
-- ready->dispatched included), not just anon/Factory — there's no code path in this app that
-- updates orders.status to anything but a real transition, so this can't break a legitimate
-- write.
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT (
    (OLD.status = 'pending' AND NEW.status = 'production') OR
    (OLD.status = 'production' AND NEW.status = 'ready') OR
    (OLD.status = 'ready' AND NEW.status = 'dispatched')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_validate_status_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();
