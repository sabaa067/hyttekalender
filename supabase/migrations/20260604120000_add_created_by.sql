-- Add created_by column to track which user created each calendar entry
ALTER TABLE public.calendar_entries
  ADD COLUMN IF NOT EXISTS created_by text DEFAULT NULL;
