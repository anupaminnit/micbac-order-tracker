-- order_number: MICBAC's own order reference (po_number stays the customer's PO).
-- selling_price: total USD for the order, same unit as order_value — which is now treated as
-- the cost price, so gross profit = selling_price - order_value (see src/lib/profit.js).
-- All nullable: existing orders simply have none, and analytics skips them for profit.
ALTER TABLE public.orders
  ADD COLUMN order_number TEXT,
  ADD COLUMN selling_price NUMERIC(12,2),
  ADD COLUMN destination_country TEXT;
