import { supabase } from "@/integrations/supabase/client";
import { Cake, Sparkles, CalendarDays, type LucideIcon } from "lucide-react";

export type EventType = "birthday" | "event" | "highlight";

export type CalendarEvent = {
  id: string;
  title: string;
  type: EventType;
  start_date: string;
  end_date: string;
  person: string | null;
  recurring_yearly: boolean;
  created_at: string;
};

export const EVENT_META: Record<
  EventType,
  { label: string; color: string; soft: string; icon: LucideIcon }
> = {
  birthday: {
    label: "Bursdag",
    color: "bg-event-birthday text-white",
    soft: "bg-event-birthday-soft text-event-birthday",
    icon: Cake,
  },
  event: {
    label: "Arrangement",
    color: "bg-event-event text-white",
    soft: "bg-event-event-soft text-event-event",
    icon: CalendarDays,
  },
  highlight: {
    label: "Høydepunkt",
    color: "bg-event-highlight text-white",
    soft: "bg-event-highlight-soft text-event-highlight",
    icon: Sparkles,
  },
};

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function createEvent(input: {
  title: string;
  type: EventType;
  start_date: string;
  end_date: string;
  recurring_yearly?: boolean;
}): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("events")
    .insert({ recurring_yearly: false, ...input })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Returns true if the event covers the given ISO date.
 * For recurring yearly events, only month/day are compared.
 */
export function eventCoversDate(e: CalendarEvent, dateISO: string): boolean {
  if (!e.recurring_yearly) {
    return dateISO >= e.start_date && dateISO <= e.end_date;
  }
  const md = dateISO.slice(5); // MM-DD
  const startMd = e.start_date.slice(5);
  const endMd = e.end_date.slice(5);
  if (startMd <= endMd) return md >= startMd && md <= endMd;
  // wraps across year boundary (rare)
  return md >= startMd || md <= endMd;
}