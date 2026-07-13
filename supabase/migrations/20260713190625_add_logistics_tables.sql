CREATE TABLE logistics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  container_number TEXT,
  shipping_line TEXT,
  booking_ref TEXT,
  etd DATE,
  eta DATE,
  transporter TEXT,
  vehicle_number TEXT,
  pickup_date DATE,
  sb_number TEXT,
  customs_filing_date DATE,
  customs_status TEXT NOT NULL DEFAULT 'not_filed'
    CHECK (customs_status IN ('not_filed','filed','cleared')),
  drawback_claimed BOOLEAN NOT NULL DEFAULT false,
  overall_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (overall_status IN ('pending','in_transit','action_needed','delivered')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id)
);

CREATE TABLE logistics_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logistics_id UUID NOT NULL REFERENCES logistics(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_logistics" ON logistics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_logistics_documents" ON logistics_documents FOR ALL USING (true) WITH CHECK (true);
