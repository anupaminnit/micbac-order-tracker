-- Customer list for the New Order form's type-ahead. Seeded with MICBAC's current customers;
-- owners add new ones implicitly by typing a name not yet on the list (saved on order create).
-- orders.customer stays plain text — this table only feeds suggestions, it isn't an FK.
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Case-insensitive uniqueness so "Mstack" and "MSTACK" can't both end up in the dropdown.
CREATE UNIQUE INDEX customers_name_lower_key ON public.customers (lower(name));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_authenticated" ON public.customers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "customers_insert_owner" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

INSERT INTO public.customers (name) VALUES
  ('PUREBLEACH SDN BHD'),
  ('PT. AQUATECH INDONESIA'),
  ('AN THY ENVIRONMENT TECHNOLOGY COMPANY LIMITED'),
  ('TOAN A ENVIRONMENT TECHNOLOGY JSC'),
  ('INDIVIDUAL ENTREPRENEUR RUSANOVSKY'),
  ('OMI OPERATION MAINTENANCE AND INVESTMENT JOINT STOCK COMPANY'),
  ('SNEW TRADING & SOLUTION SDN.BHD.'),
  ('FAST LOGISTICS TEAM CO'),
  ('TOP BLEACH SDN BHD'),
  ('AQUA-RICH CHON-HY FILTER AND WATER FILTER EQUIPMENT COMPANY LIMITED'),
  ('MYANMAR ICON CO., LTD'),
  ('OLEO-FATS, INCORPORATED'),
  ('MSTACK');
