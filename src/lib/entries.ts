import { supabase } from "@/integrations/supabase/client";
import { detectCabinLocations, type CabinLocation, type Category } from "./categories";

export type CalendarEntry = {
  id: string;
  title: string;
  category: Category;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type FilterKey = Exclude<Category, "birthday">;

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "cabin", label: "Hytte" },
  { key: "event", label: "Arrangementer" },
  { key: "highlight", label: "Høydepunkter" },
  { key: "note", label: "Notater" },
];

function entryMatchesSingleFilter(e: CalendarEntry, f: FilterKey) {
  if (f === "highlight") return e.category === "highlight" || e.category === "birthday";
  return e.category === f;
}

export function entryMatchesFilters(e: CalendarEntry, active: Set<FilterKey>) {
  if (active.size === 0) return true;
  for (const f of active) if (entryMatchesSingleFilter(e, f)) return true;
  return false;
}

export function entryMatchesCabinLocations(
  e: CalendarEntry,
  active: Set<Exclude<CabinLocation, "all">>,
) {
  if (active.size === 0) return true;
  if (e.category !== "cabin") return true;
  const detected = detectCabinLocations(`${e.title} ${e.description ?? ""}`);
  for (const loc of detected) if (active.has(loc)) return true;
  return false;
}

export async function fetchEntries(): Promise<CalendarEntry[]> {
  const { data, error } = await supabase
    .from("calendar_entries")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CalendarEntry[];
}

export async function createEntry(input: {
  title: string;
  category: Category;
  start_date: string;
  end_date: string;
  description?: string | null;
}): Promise<CalendarEntry> {
  const { data, error } = await supabase
    .from("calendar_entries")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEntry;
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<CalendarEntry, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  const { error } = await supabase.from("calendar_entries").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("calendar_entries").delete().eq("id", id);
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

export function entryCoversDate(e: CalendarEntry, dateISO: string): boolean {
  return dateISO >= e.start_date && dateISO <= e.end_date;
}