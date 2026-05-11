export type FilterKey = "all" | "cabin" | "events" | "birthdays" | "highlights";

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "cabin", label: "Hytte" },
  { key: "events", label: "Arrangementer" },
  { key: "birthdays", label: "Bursdager" },
  { key: "highlights", label: "Høydepunkter" },
];

export function showBookings(f: FilterKey) {
  return f === "all" || f === "cabin";
}
export function showEventType(f: FilterKey, type: "birthday" | "event" | "highlight") {
  if (f === "all") return true;
  if (f === "birthdays") return type === "birthday";
  if (f === "events") return type === "event";
  if (f === "highlights") return type === "highlight";
  return false;
}