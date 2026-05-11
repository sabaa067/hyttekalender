import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ResultSchema = z.object({
  intent: z.enum(["create", "answer"]).describe("create = user wants to add a new entry; answer = user is asking a question"),
  reply: z.string().describe("Short, friendly Norwegian answer (1-3 sentences). For 'create' intent: a brief confirmation like 'Forslag klart'."),
  draft: z
    .object({
      title: z.string(),
      category: z.enum(["cabin", "birthday", "event", "highlight", "note"]),
      start_date: z.string().describe("YYYY-MM-DD"),
      end_date: z.string().describe("YYYY-MM-DD"),
      description: z.string().nullable(),
    })
    .nullable()
    .describe("Only set when intent is 'create'."),
});

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string }) => z.object({ query: z.string().min(1).max(500) }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI er ikke konfigurert");

    const { data: entries, error } = await supabaseAdmin
      .from("calendar_entries")
      .select("title,category,start_date,end_date,description")
      .order("start_date", { ascending: true });
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-flash");

    const system = [
      "Du er en hjelpsom assistent for en norsk familiekalender.",
      `Dagens dato er ${today}. Året er ${new Date().getFullYear()}.`,
      "Kategorier: cabin (hytte), birthday (bursdag), event (arrangement), highlight (høydepunkt), note (notat).",
      "Hvis brukeren vil legge til noe: sett intent='create' og fyll ut draft. Velg passende kategori, lag en kort, ryddig tittel. description=null hvis ikke nødvendig.",
      "Hvis brukeren spør om noe: sett intent='answer', draft=null. Svar kort og presist på norsk basert på kalenderdataene under. Hvis ingenting passer, si det vennlig.",
      "Tolk datoer på norsk (f.eks. '17 mai' = 17. mai i år, '12-15 juli' = 2026-07-12 til 2026-07-15).",
      "",
      "KALENDERDATA (JSON):",
      JSON.stringify(entries ?? []),
    ].join("\n");

    const { experimental_output } = await generateText({
      model,
      system,
      prompt: data.query,
      experimental_output: Output.object({ schema: ResultSchema }),
    });

    return experimental_output;
  });