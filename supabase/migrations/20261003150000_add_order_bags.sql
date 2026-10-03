-- Replaces the free-text packing_type in the UI with a bag count + bag type the factory can
-- act on directly. packing_type is kept (not dropped) so text on older orders isn't lost.
ALTER TABLE public.orders
  ADD COLUMN bag_count INTEGER CHECK (bag_count > 0),
  ADD COLUMN bag_type TEXT;
