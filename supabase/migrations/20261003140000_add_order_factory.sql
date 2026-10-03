-- Which MICBAC factory makes the order. Free text (suggestions live in src/lib/factories.js),
-- nullable so existing orders are unaffected.
ALTER TABLE public.orders ADD COLUMN factory TEXT;
