-- Removes an abandoned schema attempt found alongside the tables this app actually uses
-- (orders, audit_trail, logistics, logistics_documents). manufacturing_orders/audit_log/
-- request_seq were confirmed empty (0 rows); public.users held 2 rows from an unrecognized
-- prior setup, confirmed abandoned and safe to drop. None of these were referenced by any
-- application code or migration in this repo.
DROP TABLE IF EXISTS public.audit_log;
DROP TABLE IF EXISTS public.manufacturing_orders;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.request_seq;
