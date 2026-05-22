import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { parseISODate } from "./entries";

export type ActivityAction = "create" | "update" | "delete";

export type ActivityRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: ActivityAction;
  entry_title: string;
  entry_category: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export async function logActivity(input: {
  actor: { id: string; name: string } | null;
  action: ActivityAction;
  entry: { title: string; category?: string | null; start_date?: string | null; end_date?: string | null };
}) {
  if (!input.actor) return;
  const { error } = await supabase.from("activity_log").insert({
    actor_id: input.actor.id,
    actor_name: input.actor.name,
    action: input.action,
    entry_title: input.entry.title,
    entry_category: input.entry.category ?? null,
    start_date: input.entry.start_date ?? null,
    end_date: input.entry.end_date ?? null,
  });
  if (error) console.error("[activity] log failed", error);
}

export async function fetchActivity(limit = 100): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as ActivityRow[];
}

export async function fetchLastRead(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("activity_reads")
    .select("last_read_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[activity] fetchLastRead", error);
    return null;
  }
  return data?.last_read_at ?? null;
}

export async function markRead(userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("activity_reads")
    .upsert({ user_id: userId, last_read_at: now }, { onConflict: "user_id" });
  if (error) console.error("[activity] markRead", error);
  return now;
}

const VERB: Record<ActivityAction, string> = {
  create: "opprettet",
  update: "redigerte",
  delete: "slettet",
};

export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return "";
  const s = parseISODate(start);
  if (!end || end === start) return format(s, "d. MMM yyyy", { locale: nb });
  const e = parseISODate(end);
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${format(s, "d.", { locale: nb })}–${format(e, "d. MMM yyyy", { locale: nb })}`;
  }
  return `${format(s, "d. MMM", { locale: nb })} – ${format(e, "d. MMM yyyy", { locale: nb })}`;
}

export function describeActivity(a: ActivityRow): string {
  const range = formatDateRange(a.start_date, a.end_date);
  const base = `${a.actor_name} ${VERB[a.action]}: ${a.entry_title}`;
  return range ? `${base} – ${range}` : base;
}
