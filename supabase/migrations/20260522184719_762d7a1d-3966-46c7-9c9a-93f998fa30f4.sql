-- 1. Drop unused legacy tables
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;

-- 2. Replace permissive write policies on calendar_entries
DROP POLICY IF EXISTS "Anyone can create entries" ON public.calendar_entries;
DROP POLICY IF EXISTS "Anyone can update entries" ON public.calendar_entries;
DROP POLICY IF EXISTS "Anyone can delete entries" ON public.calendar_entries;
-- SELECT stays public (family calendar is intentionally readable to authed family browsers;
-- there is no per-user scoping. Service role is used server-side for all writes.)

-- 3. Lock down activity_log: drop public read+insert; service role only
DROP POLICY IF EXISTS "anyone insert log" ON public.activity_log;
DROP POLICY IF EXISTS "anyone read log" ON public.activity_log;

-- 4. Lock down activity_reads: drop all public policies; service role only
DROP POLICY IF EXISTS "anyone insert reads" ON public.activity_reads;
DROP POLICY IF EXISTS "anyone read reads" ON public.activity_reads;
DROP POLICY IF EXISTS "anyone update reads" ON public.activity_reads;

-- 5. Sessions table for the shared-password login flow
CREATE TABLE IF NOT EXISTS public.app_sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (server functions) can access.

CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expires_at_idx ON public.app_sessions(expires_at);
