import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateHolidaysForYears } from "./holidays";

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; context?: unknown }) =>
    z
      .object({
        query: z.string().min(1).max(500),
        context: z
          .object({
            today: z.string().optional(),
            view: z.enum(["modern", "overview", "excel"]).optional(),
            visibleMonth: z.string().optional(), // YYYY-MM
            visibleYear: z.number().optional(),
            activeFilters: z.array(z.string()).optional(),
            activeCabinLocations: z.array(z.string()).optional(),
            showHolidays: z.boolean().optional(),
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const fallback = {
      intent: "answer" as const,
      reply:
        "Jeg fant ingen treff akkurat nå. Prøv et av forslagene under – jeg søker direkte i kalenderen.",
      suggestions: [
        "Hva skjer 17. mai?",
        "Når er Mortens familie på Paradis?",
        "Vis alle hytteturer i juli",
      ] as string[],
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("[assistant] missing LOVABLE_API_KEY");
      return fallback;
    }

    let entries: unknown[] = [];
    try {
      const res = await supabaseAdmin
        .from("calendar_entries")
        .select("id,title,category,start_date,end_date,description")
        .order("start_date", { ascending: true });
      if (res.error) throw res.error;
      entries = res.data ?? [];
    } catch (e) {
      console.error("[assistant] db error:", e);
    }

    // Inkluder norske høytider for de relevante årene slik at AI kan svare på "17 mai", "påske", "jul" osv.
    const nowYear = new Date().getFullYear();
    const ctxYear = (data.context as { visibleYear?: number } | undefined)?.visibleYear ?? nowYear;
    const holidayYears = Array.from(new Set([nowYear - 1, nowYear, nowYear + 1, ctxYear]));
    const holidays = generateHolidaysForYears(holidayYears).map((h) => ({
      id: h.id,
      title: h.title,
      category: h.category,
      start_date: h.start_date,
      end_date: h.end_date,
      description: h.description,
    }));
    const allEntries = [...entries, ...holidays];

    const today = new Date().toISOString().slice(0, 10);
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = gateway("google/gemini-2.5-pro");

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
      matched_ids: z.array(z.string()).optional(),
      suggestions: z.array(z.string()).max(4).optional(),
    });

    const ctx = data.context ?? {};
    const system = [
      "Du er en hjelpsom assistent for en norsk familiekalender.",
      `Dagens dato er ${today}. Året er ${new Date().getFullYear()}.`,
      "",
      "AKTIV KONTEKST I APPEN (bruk for å tolke 'denne uka', 'denne måneden', 'nå'):",
      `- Modus: ${ctx.view ?? "modern"} (Moderne=månedsvisning, Oversikt=årsvisning, Excel=tabell).`,
      `- Synlig måned: ${ctx.visibleMonth ?? "–"}. Synlig år: ${ctx.visibleYear ?? new Date().getFullYear()}.`,
      `- Aktive kategorifilter: ${(ctx.activeFilters && ctx.activeFilters.length ? ctx.activeFilters.join(", ") : "ingen (viser alt)")}.`,
      `- Aktive hyttesteder: ${(ctx.activeCabinLocations && ctx.activeCabinLocations.length ? ctx.activeCabinLocations.join(", ") : "alle")}.`,
      `- Høytider vises: ${ctx.showHolidays ? "ja" : "nei"}.`,
      "",
      "FUNKSJONER OG BEGREPER DU MÅ KJENNE:",
      "- Kategorier: Hytte (cabin), Arrangementer (event), Høydepunkter (highlight, inkl. bursdager), Notater (note), Høytider (holiday – norske helligdager, generert automatisk).",
      "- Hytte har to steder: 'Paradis' og 'Fjordgløtt'. Brukere kan velge ett eller begge samtidig.",
      "- Norske høytider er gjentakende hvert år (Påske, 17. mai, Jul, osv.) og ligger som 'holiday'.",
      "- En dag kan ha mange overlappende oppføringer; flere filtre kan kombineres samtidig.",
      "- Kalenderen støtter både historiske og fremtidige datoer – svar gjerne om det som har skjedd.",
      "",
      "Du må være TÅLMODIG og TOLERANT for: skrivefeil, dialekt (f.eks. 'ka' = 'hva', 'verer' = 'være', 'hvilkene' = 'hvilke'), manglende tegnsetting, små bokstaver, korte fragmenter, og uformell norsk.",
      "Tolk navn og titler FUZZY — match selv ved skrivefeil (f.eks. 'morten' matcher 'Mortens familie', 'paradis' matcher 'Paradiset', 'fjordglot' matcher 'Fjordgløtt'). Bruk skjønn.",
      "Forstå norske månedsnavn og forkortelser (jan, feb, mar, apr, mai, jun, jul, aug, sep, okt, nov, des). Tolk datoer fritt: '12 til 15 juli' = 2026-07-12 til 2026-07-15. '21 jan til 23' = 2026-01-21 til 2026-01-23. '17 mai' = 2026-05-17.",
      "Hvis brukeren vil legge til noe: sett intent='create' og fyll ut draft (title, category, start_date, end_date YYYY-MM-DD). Lag en kort, ryddig tittel. La 'description' være tom om unødvendig.",
      "Hvis brukeren spør om noe: sett intent='answer'. Søk ALLTID gjennom HELE KALENDERDATA (titler OG beskrivelser) før du svarer. Bruk fuzzy/delmatch på navn (f.eks. 'vera' matcher alt som inneholder 'Vera', 'vra' osv.). List ALLE relevante treff – ikke bare ett.",
      "GI ALDRI OPP. Hvis du ikke finner direkte treff: prøv synonymer, delstrenger, og beslektede begreper. Bare som SISTE utvei svar at det ikke finnes oppføringer – og foreslå da konkrete omformuleringer.",
      "FORSTÅ IMPLISITTE SPØRSMÅL: 'Når har Vera fri?' = finn alle Vera-relaterte oppføringer OG identifiser åpne perioder mellom dem. 'Hvem er på Paradis i juni?' = list alle hytteoppføringer i juni som nevner Paradis. 'Når er det ledig på Fjordgløtt?' = vis perioder UTEN Fjordgløtt-bookinger.",
      "Tolk relative tidsuttrykk ut fra dagens dato og synlig måned: 'denne uka', 'neste helg', 'i sommer' (jun-aug), 'i høst' (sep-nov), 'til jul', 'i fjor', 'i år'.",
      "Foretrekk strukturerte svar: punktlister når du lister flere oppføringer, korte avsnitt ellers. Aldri lange tekstvegger.",
      "Når svaret refererer til konkrete kalenderoppføringer: list opp deres 'id' (UUID fra dataene) i 'matched_ids'. Aldri finn på id-er — bruk bare id-er som finnes i KALENDERDATA.",
      "Hvis (og bare hvis) du virkelig ikke finner noe relevant etter grundig søk: gi et kort, vennlig svar basert på beste tolkning, og legg ved 2-4 konkrete omformuleringer i 'suggestions'. Aldri skriv 'jeg forstod ikke' eller 'jeg vet ikke' – gjør alltid et faktisk søk først.",
      "Eksempel: bruker skriver 'når skal morten på hyta' → reply: 'Mente du noe av dette?' og suggestions: ['Når skal Mortens familie på hytta?', 'Når er Mortens familie på Paradis?', 'Når er Mortens familie på Fjordgløtt?'].",
      "Eksempel: bruker skriver 'hva skjer 17 jn' → suggestions: ['Hva skjer 17. juni?', 'Hva skjer 17. januar?', 'Hva skjer 17. juli?'].",
      "Svar ALLTID på norsk. ALDRI på engelsk.",
      "",
      `KALENDERDATA (JSON, ${allEntries.length} oppføringer – LIVE fra databasen + genererte høytider):`,
      JSON.stringify(allEntries),
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
      return fallback;
    }
  });