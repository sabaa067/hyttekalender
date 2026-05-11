-- Event type enum
CREATE TYPE public.event_type AS ENUM ('birthday', 'event', 'highlight');

CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type public.event_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  person TEXT,
  recurring_yearly BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Anyone can create events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete events" ON public.events FOR DELETE USING (true);
CREATE POLICY "Anyone can update events" ON public.events FOR UPDATE USING (true);

CREATE INDEX idx_events_dates ON public.events (start_date, end_date);
CREATE INDEX idx_events_type ON public.events (type);