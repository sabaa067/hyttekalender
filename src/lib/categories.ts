import { Home, Cake, Sparkles, CalendarDays, StickyNote, type LucideIcon } from "lucide-react";

export type Category = "cabin" | "birthday" | "event" | "highlight" | "note";

export const CATEGORY_META: Record<
  Category,
  { label: string; color: string; soft: string; dot: string; icon: LucideIcon }
> = {
  cabin: {
    label: "Hytte",
    color: "bg-cat-cabin text-white",
    soft: "bg-cat-cabin-soft text-cat-cabin",
    dot: "bg-cat-cabin",
    icon: Home,
  },
  // Birthdays are kept as a sub-type of "highlight" — same colors, cake icon.
  birthday: {
    label: "Høydepunkt",
    color: "bg-cat-highlight text-white",
    soft: "bg-cat-highlight-soft text-cat-highlight",
    dot: "bg-cat-highlight",
    icon: Cake,
  },
  event: {
    label: "Arrangement",
    color: "bg-cat-event text-white",
    soft: "bg-cat-event-soft text-cat-event",
    dot: "bg-cat-event",
    icon: CalendarDays,
  },
  highlight: {
    label: "Høydepunkt",
    color: "bg-cat-highlight text-white",
    soft: "bg-cat-highlight-soft text-cat-highlight",
    dot: "bg-cat-highlight",
    icon: Sparkles,
  },
  note: {
    label: "Notat",
    color: "bg-cat-note text-white",
    soft: "bg-cat-note-soft text-cat-note",
    dot: "bg-cat-note",
    icon: StickyNote,
  },
};

// Categories the user can pick from in the UI (no standalone "Bursdag").
export const CATEGORIES: Category[] = ["cabin", "event", "highlight", "note"];

// Detect a birthday from title even when category is "highlight".
export function isBirthdayEntry(e: { title: string; category: Category }): boolean {
  if (e.category === "birthday") return true;
  return /bursdag|fødselsdag|år\b/i.test(e.title);
}

export type CabinLocation = "all" | "paradis" | "fjord";

export const CABIN_LOCATION_META: Record<
  Exclude<CabinLocation, "all">,
  { label: string; color: string; soft: string }
> = {
  paradis: {
    label: "Paradis",
    color: "bg-cabin-paradis text-white",
    soft: "bg-cabin-paradis-soft text-cabin-paradis",
  },
  fjord: {
    label: "Fjordgløtt",
    color: "bg-cabin-fjord text-white",
    soft: "bg-cabin-fjord-soft text-cabin-fjord",
  },
};

export function detectCabinLocations(text: string): Set<Exclude<CabinLocation, "all">> {
  const t = text.toLowerCase();
  const out = new Set<Exclude<CabinLocation, "all">>();
  if (/paradis/.test(t)) out.add("paradis");
  if (/fjordgl(ø|o)tt|fjordglott/.test(t)) out.add("fjord");
  return out;
}

// Returns the primary location for an entry (first match), used for coloring.
export function primaryCabinLocation(text: string): Exclude<CabinLocation, "all"> | null {
  const locs = detectCabinLocations(text);
  return locs.has("paradis") ? "paradis" : locs.has("fjord") ? "fjord" : null;
}

export type EntryVisual = {
  color: string;
  soft: string;
  icon: LucideIcon;
  label: string;
  // Visual weight: cabin = strongest, highlight/birthday = warm soft, event = medium, note = minimal.
  weight: "strong" | "warm" | "medium" | "minimal";
};

export function getEntryVisual(e: { title: string; category: Category; description?: string | null }): EntryVisual {
  const meta = CATEGORY_META[e.category];
  if (e.category === "cabin") {
    const loc = primaryCabinLocation(`${e.title} ${e.description ?? ""}`);
    if (loc) {
      const lm = CABIN_LOCATION_META[loc];
      return { color: lm.color, soft: lm.soft, icon: meta.icon, label: `Hytte · ${lm.label}`, weight: "strong" };
    }
    return { color: meta.color, soft: meta.soft, icon: meta.icon, label: meta.label, weight: "strong" };
  }
  if (e.category === "highlight" || e.category === "birthday") {
    return { color: meta.color, soft: meta.soft, icon: meta.icon, label: meta.label, weight: "warm" };
  }
  if (e.category === "event") {
    return { color: meta.color, soft: meta.soft, icon: meta.icon, label: meta.label, weight: "medium" };
  }
  return { color: meta.color, soft: meta.soft, icon: meta.icon, label: meta.label, weight: "minimal" };
}
