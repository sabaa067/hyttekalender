import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateToken, validateSessionToken } from "./session.server";

const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const loginWithPassword = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => {
    const pw = data.password.trim();
    if (!pw) throw new Error("Skriv inn et passord");

    const { data: row, error } = await supabaseAdmin
      .from("app_users")
      .select("id,name,role")
      .eq("password", pw)
      .maybeSingle();

    if (error) {
      console.error("[auth] login lookup failed", error);
      throw new Error("Kunne ikke logge inn");
    }
    if (!row) throw new Error("Feil passord");

    const token = generateToken();
    const { error: insErr } = await supabaseAdmin
      .from("app_sessions")
      .insert({ token, user_id: row.id });
    if (insErr) {
      console.error("[auth] session insert failed", insErr);
      throw new Error("Kunne ikke opprette sesjon");
    }

    return {
      token,
      user: {
        id: row.id,
        name: row.name,
        role: row.role as "admin" | "viewer",
      },
    };
  });

const tokenSchema = z.object({ token: z.string().min(1).max(500) });

export const logoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("app_sessions").delete().eq("token", data.token);
    return { ok: true };
  });

export const validateSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const ctx = await validateSessionToken(data.token);
    return { id: ctx.userId, name: ctx.name, role: ctx.role };
  });
