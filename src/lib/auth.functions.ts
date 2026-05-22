import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

    return {
      id: row.id,
      name: row.name,
      role: row.role as "admin" | "viewer",
    };
  });
