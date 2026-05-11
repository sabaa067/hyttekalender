import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

    const ResultSchema = z.object({
      intent: z.enum(["create", "answer"]),
      reply: z.string(),
      draft: z
        .object({
          title: z.string(),
          category: z.enum(["cabin", "birthday", "event", "highlight", "note"]),
          start_date: z.string(),
          end_date: z.string(),
          description: z.string().optional(),
        })
        .optional(),
    });

    const system = [
      "Du er en hjelpsom assistent for en norsk familiekalender.",
      `Dagens dato er ${today}. Året er ${new Date().getFullYear()}.`,
      "Du må være TÅLMODIG og TOLERANT for: skrivefeil, dialekt (f.eks. 'ka' = 'hva', 'verer' = 'være', 'hvilkene' = 'hvilke'), manglende tegnsetting, små bokstaver, korte fragmenter, og uformell norsk.",
      "Tolk navn og titler FUZZY — match selv ved skrivefeil (f.eks. 'morten' matcher 'Mortens familie', 'paradis' matcher 'Paradiset'). Bruk skjønn.",
      "Forstå norske månedsnavn og forkortelser (jan, feb, mar, apr, mai, jun, jul, aug, sep, okt, nov, des). Tolk datoer fritt: '12 til 15 juli' = 2026-07-12 til 2026-07-15. '21 jan til 23' = 2026-01-21 til 2026-01-23. '17 mai' = 2026-05-17.",
      "Kategorier: cabin (hytte/hyttetur/opphold), birthday (bursdag/fødselsdag), event (arrangement/møte/tur), highlight (høydepunkt/spesielt), note (notat/påminnelse).",
      "Hvis brukeren vil legge til noe: sett intent='create' og fyll ut draft (title, category, start_date, end_date YYYY-MM-DD). Lag en kort, ryddig tittel. La 'description' være tom om unødvendig.",
      "Hvis brukeren spør om noe: sett intent='answer'. Svar kort (1-3 setninger), vennlig og presist basert på kalenderdataene. Søk fuzzy i title/description.",
      "Hvis du er usikker: gjør ditt beste forsøk og still ETT kort oppklaringsspørsmål i 'reply' (f.eks. 'Mente du Mortens familie?'). Aldri si 'feil' eller 'kunne ikke tolke'.",
      "Hvis ingenting matcher: svar vennlig som 'Fant ingenting på den datoen' i stedet for å feile.",
      "Svar ALLTID på norsk. ALDRI på engelsk.",
      "",
      "KALENDERDATA (JSON):",
      JSON.stringify(entries ?? []),
    ].join("\n");

    try {
      const { experimental_output } = await generateText({
        model,
        system,
        prompt: data.query,
        experimental_output: Output.object({ schema: ResultSchema }),
      });
      return experimental_output;
    } catch (err) {
      console.error("[assistant] schema/parse error:", err);
      return {
        intent: "answer" as const,
        reply:
          "Jeg forstod ikke helt spørsmålet. Prøv for eksempel: \"Hva skjer 11 juni?\" eller \"Legg inn hyttetur 12–15 juli\".",
      };
    }
  });