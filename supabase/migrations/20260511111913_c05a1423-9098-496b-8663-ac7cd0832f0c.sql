
CREATE TYPE public.entry_category AS ENUM ('cabin', 'birthday', 'event', 'highlight');

CREATE TABLE public.calendar_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category public.entry_category NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT calendar_entries_date_order CHECK (end_date >= start_date)
);

CREATE INDEX idx_calendar_entries_dates ON public.calendar_entries (start_date, end_date);

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entries" ON public.calendar_entries FOR SELECT USING (true);
CREATE POLICY "Anyone can create entries" ON public.calendar_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update entries" ON public.calendar_entries FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete entries" ON public.calendar_entries FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_calendar_entries_updated_at
BEFORE UPDATE ON public.calendar_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
