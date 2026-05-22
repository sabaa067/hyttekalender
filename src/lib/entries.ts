import { supabase } from "@/integrations/supabase/client";
import { detectCabinLocations, primaryCabinLocation, type CabinLocation, type Category } from "./categories";

// Categories persisted in the DB (holiday is virtual, generated client-side).
type DBCategory = Exclude<Category, "holiday">;

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

export type FilterKey =
  | "paradis"
  | "fjord"
  | "event"
  | "highlight"
  | "note"
  | "holiday";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "paradis", label: "Paradis" },
  { key: "fjord", label: "Fjordgløtt" },
  { key: "event", label: "Arrangementer" },
  { key: "highlight", label: "Høydepunkter" },
  { key: "note", label: "Notater" },
];

function entryMatchesSingleFilter(e: CalendarEntry, f: FilterKey) {
  if (f === "paradis" || f === "fjord") {
    if (e.category !== "cabin") return false;
    const loc = primaryCabinLocation(`${e.title} ${e.description ?? ""}`);
    return loc === f;
  }
  if (f === "highlight") return e.category === "highlight" || e.category === "birthday";
  if (f === "holiday") return e.category === "holiday";
  return e.category === f;
}

export function entryMatchesFilters(e: CalendarEntry, active: Set<FilterKey>) {
  if (active.size === 0) return false;
  for (const f of active) if (entryMatchesSingleFilter(e, f)) return true;
  return false;
}

export function entryMatchesCabinLocations(
  _e: CalendarEntry,
  _active: Set<Exclude<CabinLocation, "all">>,
) {
  // Deprecated: Paradis/Fjordgløtt are now top-level filters; kept as no-op for compatibility.
  return true;
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
    .insert(input as { category: DBCategory; title: string; start_date: string; end_date: string; description?: string | null })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEntry;
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<CalendarEntry, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_entries")
    .update(patch as Partial<{ category: DBCategory; title: string; start_date: string; end_date: string; description: string | null }>)
    .eq("id", id);
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