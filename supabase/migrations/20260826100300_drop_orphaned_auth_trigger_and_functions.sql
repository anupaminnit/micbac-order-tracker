-- More cleanup from the same abandoned May schema experiment (see 20260826100000).
-- on_auth_user_created / handle_new_user() was firing on every new Supabase Auth signup
-- and inserting into a public.profiles shape ("full_name", default role 'requestor') that
-- doesn't match this app's model — it was already broken before this migration (the old
-- profiles table it targeted didn't even exist), and became a hard failure once Phase 1
-- created a real public.profiles table with different columns ("Database error creating
-- new user" in the Auth dashboard). Confirmed via pg_depend that none of these functions
-- are referenced by any trigger, policy, view, or default anywhere in the database.
--
-- NOTE: public.get_my_role() is deliberately NOT dropped here — it's actually in active use
-- by storage RLS policies (packaging_images_admin_insert/update/delete on storage.objects),
-- discovered when an earlier version of this migration failed to apply.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.generate_reference_number();
DROP FUNCTION IF EXISTS public.log_status_change();
DROP FUNCTION IF EXISTS public.notify_on_status_change();
DROP FUNCTION IF EXISTS public.set_reference_number();
DROP FUNCTION IF EXISTS public.update_updated_at();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
