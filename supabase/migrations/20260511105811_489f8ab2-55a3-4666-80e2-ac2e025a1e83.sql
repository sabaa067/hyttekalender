
CREATE TYPE public.booking_person AS ENUM ('grandfather', 'father', 'uncle');

CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person public.booking_person NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookings_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX bookings_dates_idx ON public.bookings (start_date, end_date);

-- Prevent overlapping bookings using exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    daterange(start_date, end_date, '[]') WITH &&
  );

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bookings"
  ON public.bookings FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete bookings"
  ON public.bookings FOR DELETE
  USING (true);
