-- Soft delete: owner can cancel an order instead of a real DELETE, so its audit trail and any
-- logistics record stay intact (a real DELETE would cascade-remove both). Cancelled orders drop
-- out of the default order list/stats/analytics but remain queryable (see getOrders in
-- src/lib/supabase.js — .neq('status','cancelled') unless a status filter is explicitly given).
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'production', 'ready', 'dispatched', 'cancelled'));

-- Allow cancelling from any non-cancelled state, alongside the existing forward-only pipeline
-- transitions enforced since Phase 5.
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
    (OLD.status = 'ready' AND NEW.status = 'dispatched') OR
    (OLD.status <> 'cancelled' AND NEW.status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
