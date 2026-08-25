-- Real auth foundation: one profile row per Supabase Auth user, holding the app role.
-- Replaces the old client-side hardcoded username/password scheme in src/App.jsx, which
-- shipped VITE_OWNER_PASSWORD/VITE_ADMIN_PASSWORD in plaintext inside the built JS bundle.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- A signed-in user may read only their own profile row (needed to learn their own role).
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- SECURITY DEFINER + fixed search_path: safe to call from RLS policies on other tables
-- without letting callers control what "public.profiles" resolves to.
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.current_role() = 'owner';
$$;

-- Stamps orders.created_by / audit_trail.changed_by with the authenticated caller's email
-- server-side, so a signed-in client can't forge who an action is attributed to by passing
-- an arbitrary string. Falls back to the client-supplied value when there's no session (e.g.
-- the unauthenticated Factory route, until Phase 5 gives it its own identity mechanism).
CREATE OR REPLACE FUNCTION public.stamp_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.stamp_changed_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.changed_by := COALESCE((SELECT email FROM public.profiles WHERE id = auth.uid()), NEW.changed_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_stamp_created_by
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_created_by();

CREATE TRIGGER audit_trail_stamp_changed_by
  BEFORE INSERT ON public.audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.stamp_changed_by();
