import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateSessionToken } from "./session.server";

const tokenOnly = z.object({ token: z.string().min(1).max(500) });

const logSchema = z.object({
  token: z.string().min(1).max(500),
  action: z.enum(["create", "update", "delete"]),
  entry: z.object({
    title: z.string().min(1).max(500),
    category: z.string().max(100).nullable().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  }),
});

const limitSchema = z.object({
  token: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(500).optional(),
});

export const logActivityFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => logSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await validateSessionToken(data.token);
    const { error } = await supabaseAdmin.from("activity_log").insert({
      actor_id: ctx.userId,
      actor_name: ctx.name,
      action: data.action,
      entry_title: data.entry.title,
      entry_category: data.entry.category ?? null,
      start_date: data.entry.start_date ?? null,
      end_date: data.entry.end_date ?? null,
    });
    if (error) {
      console.error("[activity] log failed", error);
      throw new Error("Kunne ikke logge aktivitet");
    }
    return { ok: true };
  });

export const fetchActivityFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => limitSchema.parse(data))
  .handler(async ({ data }) => {
    await validateSessionToken(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const fetchLastReadFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenOnly.parse(data))
  .handler(async ({ data }) => {
    const ctx = await validateSessionToken(data.token);
    const { data: row, error } = await supabaseAdmin
      .from("activity_reads")
      .select("last_read_at")
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (error) {
      console.error("[activity] fetchLastRead", error);
      return { last_read_at: null as string | null };
    }
    return { last_read_at: row?.last_read_at ?? null };
  });

export const markReadFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenOnly.parse(data))
  .handler(async ({ data }) => {
    const ctx = await validateSessionToken(data.token);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("activity_reads")
      .upsert({ user_id: ctx.userId, last_read_at: now }, { onConflict: "user_id" });
    if (error) console.error("[activity] markRead", error);
    return { now };
  });
