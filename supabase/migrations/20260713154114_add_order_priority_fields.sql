ALTER TABLE orders
  ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent','high','normal','low')),
  ADD COLUMN po_number TEXT,
  ADD COLUMN order_value NUMERIC(12,2),
  ADD COLUMN packing_type TEXT,
  ADD COLUMN delivery_address TEXT;
