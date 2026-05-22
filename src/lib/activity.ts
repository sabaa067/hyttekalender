import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { parseISODate } from "./entries";
import { getStoredToken } from "./auth";
import {
  logActivityFn,
  fetchActivityFn,
  fetchLastReadFn,
  markReadFn,
} from "./activity.functions";

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
  const token = getStoredToken();
  if (!token) return;
  try {
    await logActivityFn({
      data: {
        token,
        action: input.action,
        entry: {
          title: input.entry.title,
          category: input.entry.category ?? null,
          start_date: input.entry.start_date ?? null,
          end_date: input.entry.end_date ?? null,
        },
      },
    });
  } catch (err) {
    console.error("[activity] log failed", err);
  }
}

export async function fetchActivity(limit = 100): Promise<ActivityRow[]> {
  const token = getStoredToken();
  if (!token) return [];
  const rows = (await fetchActivityFn({ data: { token, limit } })) as ActivityRow[];
  return rows;
}

export async function fetchLastRead(_userId: string): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = (await fetchLastReadFn({ data: { token } })) as { last_read_at: string | null };
    return res.last_read_at;
  } catch (err) {
    console.error("[activity] fetchLastRead", err);
    return null;
  }
}

export async function markRead(_userId: string) {
  const token = getStoredToken();
  if (!token) return new Date().toISOString();
  try {
    const res = (await markReadFn({ data: { token } })) as { now: string };
    return res.now;
  } catch (err) {
    console.error("[activity] markRead", err);
    return new Date().toISOString();
  }
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
