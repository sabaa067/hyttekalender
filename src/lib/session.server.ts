// Server-only session helpers. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type SessionContext = {
  userId: string;
  name: string;
  role: "admin" | "viewer";
};

export async function validateSessionToken(token: string | undefined | null): Promise<SessionContext> {
  if (!token || typeof token !== "string") {
    throw new Error("Ikke innlogget");
  }
  const { data: session, error } = await supabaseAdmin
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error) {
    console.error("[session] lookup failed", error);
    throw new Error("Kunne ikke verifisere sesjon");
  }
  if (!session) throw new Error("Ikke innlogget");
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("app_sessions").delete().eq("token", token);
    throw new Error("Sesjonen er utløpt");
  }
  const { data: user, error: userErr } = await supabaseAdmin
    .from("app_users")
    .select("id, name, role")
    .eq("id", session.user_id)
    .maybeSingle();
  if (userErr || !user) throw new Error("Bruker finnes ikke");
  return { userId: user.id, name: user.name, role: user.role as "admin" | "viewer" };
}

export function generateToken(): string {
  // 32 bytes of randomness, base64url-encoded.
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64url");
}
