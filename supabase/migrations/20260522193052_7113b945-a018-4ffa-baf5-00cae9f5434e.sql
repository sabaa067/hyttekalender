
-- Remove tables from realtime publication to stop broadcasting row changes to anonymous subscribers
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_log;
ALTER PUBLICATION supabase_realtime DROP TABLE public.calendar_entries;

-- Remove the permissive public SELECT policy on calendar_entries.
-- All reads now go through server functions that validate a session token via the service-role client.
DROP POLICY IF EXISTS "Anyone can view entries" ON public.calendar_entries;
