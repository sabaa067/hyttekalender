import { Home, Cake, Sparkles, CalendarDays, type LucideIcon } from "lucide-react";

export type Category = "cabin" | "birthday" | "event" | "highlight";

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
  birthday: {
    label: "Bursdag",
    color: "bg-cat-birthday text-white",
    soft: "bg-cat-birthday-soft text-cat-birthday",
    dot: "bg-cat-birthday",
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
};

export const CATEGORIES: Category[] = ["cabin", "birthday", "event", "highlight"];