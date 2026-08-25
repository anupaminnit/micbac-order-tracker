-- Public bucket per your choice (simplicity over access control for these files) — anyone
-- with a direct link can view/download without signing in. Uploads stay owner-only, consistent
-- with every other Logistics write since Phase 4.
INSERT INTO storage.buckets (id, name, public)
VALUES ('logistics-documents', 'logistics-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "logistics_documents_bucket_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'logistics-documents');

CREATE POLICY "logistics_documents_bucket_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logistics-documents' AND public.is_owner());
