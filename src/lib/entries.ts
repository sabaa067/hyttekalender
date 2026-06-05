import { detectCabinLocations, primaryCabinLocation, type CabinLocation, type Category } from "./categories";
import { getStoredToken } from "./auth";
import { createEntryFn, updateEntryFn, deleteEntryFn, listEntriesFn } from "./entries.functions";

// Categories persisted in the DB (holiday is virtual, generated client-side).
type DBCategory = Exclude<Category, "holiday">;

export type CalendarEntry = {
  id: string;
  title: string;
  category: Category;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FilterKey =
  | "paradis"
  | "fjord"
  | "event"
  | "note"
  | "holiday";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "paradis", label: "Paradis" },
  { key: "fjord", label: "Fjordgløtt" },
  { key: "event", label: "Arrangementer" },
  { key: "note", label: "Notater" },
];

export const NOTE_AUTHORS = ["Farfar", "Jørgen", "Morten"] as const;
export type NoteAuthor = (typeof NOTE_AUTHORS)[number];

function entryMatchesSingleFilter(e: CalendarEntry, f: FilterKey) {
  if (f === "paradis" || f === "fjord") {
    if (e.category !== "cabin") return false;
    const loc = primaryCabinLocation(`${e.title} ${e.description ?? ""}`);
    // If we can detect a location, only the matching filter shows the entry.
    // If no location keyword is present, the cabin entry is shown whenever
    // either cabin filter is active, so it never silently disappears.
    if (loc === null) return true;
    return loc === f;
  }
  if (f === "event") return e.category === "event" || e.category === "highlight" || e.category === "birthday";
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
  const token = getStoredToken();
  if (!token) throw new Error("Ikke innlogget");
  const rows = (await listEntriesFn({ data: { token } })) as CalendarEntry[];
  return rows ?? [];
}

export async function createEntry(input: {
  title: string;
  category: Category;
  start_date: string;
  end_date: string;
  description?: string | null;
  created_by?: string | null;
}): Promise<CalendarEntry> {
  const token = getStoredToken();
  if (!token) throw new Error("Ikke innlogget");
  if (input.category === "holiday") throw new Error("Kan ikke lagre helligdager");
  const row = (await createEntryFn({
    data: {
      token,
      title: input.title,
      category: input.category as DBCategory,
      start_date: input.start_date,
      end_date: input.end_date,
      description: input.description ?? null,
      created_by: input.created_by ?? null,
    },
  })) as CalendarEntry;
  return row;
}

export async function updateEntry(
  id: string,
  patch: Partial<Omit<CalendarEntry, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error("Ikke innlogget");
  const safePatch: Record<string, unknown> = {};
  if (patch.title !== undefined) safePatch.title = patch.title;
  if (patch.category !== undefined) {
    if (patch.category === "holiday") throw new Error("Ugyldig kategori");
    safePatch.category = patch.category;
  }
  if (patch.start_date !== undefined) safePatch.start_date = patch.start_date;
  if (patch.end_date !== undefined) safePatch.end_date = patch.end_date;
  if (patch.description !== undefined) safePatch.description = patch.description;
  await updateEntryFn({ data: { token, id, patch: safePatch as never } });
}

export async function deleteEntry(id: string): Promise<void> {
  const token = getStoredToken();
  if (!token) throw new Error("Ikke innlogget");
  await deleteEntryFn({ data: { token, id } });
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