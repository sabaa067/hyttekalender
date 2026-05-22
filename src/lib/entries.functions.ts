import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateSessionToken } from "./session.server";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ugyldig dato");

const categoryEnum = z.enum([
  "cabin",
  "event",
  "highlight",
  "birthday",
  "note",
]);

const createSchema = z.object({
  token: z.string().min(1).max(500),
  title: z.string().trim().min(1).max(500),
  category: categoryEnum,
  start_date: isoDate,
  end_date: isoDate,
  description: z.string().max(5000).nullable().optional(),
});

const updateSchema = z.object({
  token: z.string().min(1).max(500),
  id: z.string().uuid(),
  patch: z.object({
    title: z.string().trim().min(1).max(500).optional(),
    category: categoryEnum.optional(),
    start_date: isoDate.optional(),
    end_date: isoDate.optional(),
    description: z.string().max(5000).nullable().optional(),
  }),
});

const deleteSchema = z.object({
  token: z.string().min(1).max(500),
  id: z.string().uuid(),
});

export const createEntryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data }) => {
    await validateSessionToken(data.token);
    const { token: _t, ...input } = data;
    const { data: row, error } = await supabaseAdmin
      .from("calendar_entries")
      .insert(input)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateEntryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data }) => {
    await validateSessionToken(data.token);
    const { error } = await supabaseAdmin
      .from("calendar_entries")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEntryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ data }) => {
    await validateSessionToken(data.token);
    const { error } = await supabaseAdmin
      .from("calendar_entries")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
