import { supabase } from "@/integrations/supabase/client";
import type { Person } from "./persons";

export type Booking = {
  id: string;
  person: Person;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  created_at: string;
};

export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Booking[];
}

export async function createBooking(input: {
  person: Person;
  start_date: string;
  end_date: string;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .insert(input)
    .select()
    .single();
  if (error) {
    // Postgres exclusion constraint violation
    if (error.code === "23P01" || /overlap|exclusion/i.test(error.message)) {
      throw new Error("Disse datoene er allerede booket. Velg andre dager.");
    }
    throw new Error(error.message);
  }
  return data as Booking;
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function bookingCoversDate(b: Booking, dateISO: string): boolean {
  return dateISO >= b.start_date && dateISO <= b.end_date;
}