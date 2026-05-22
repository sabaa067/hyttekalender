-- Remove public SELECT on app_users (contains plaintext passwords).
-- Login moves to a server function using the service role key.
DROP POLICY IF EXISTS "anyone read users" ON public.app_users;

-- Deny-by-default: no policies means no access for anon/authenticated roles.
-- The service role bypasses RLS and is used server-side for login lookups.
