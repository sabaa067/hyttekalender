import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateHolidaysForYears } from "./holidays";
import { detectCabinLocations } from "./categories";

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; context?: unknown; history?: unknown }) =>
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
            userName: z.string().optional(),
            userRole: z.string().optional(),
            entries: z
              .array(
                z.object({
                  id: z.string(),
                  title: z.string(),
                  category: z.string(),
                  start_date: z.string(),
                  end_date: z.string(),
                  description: z.string().nullable().optional(),
                }),
              )
              .max(2000)
              .optional(),
          })
          .optional(),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().max(2000),
            }),
          )
          .max(12)
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const fallback = {
      intent: "answer" as const,
      reply:
        "Fant ingen treff. Prøv et av forslagene under.",
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

    // Prefer the client's pre-indexed entries (already loaded in the app) to skip a DB roundtrip.
    // Fall back to a server fetch only if the client didn't send any.
    const ctxAny = (data.context ?? {}) as { entries?: unknown[] };
    let entries: unknown[] = Array.isArray(ctxAny.entries) ? ctxAny.entries : [];
    if (entries.length === 0) {
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
    // Berik hver oppføring med utledet metadata slik at modellen kan resonnere semantisk
    // (hyttested, normalisert søketekst) i stedet for ren tekst-matching.
    type RawEntry = {
      id: string;
      title: string;
      category: string;
      start_date: string;
      end_date: string;
      description?: string | null;
    };
    const enrich = (e: RawEntry) => {
      const blob = `${e.title} ${e.description ?? ""}`.toLowerCase();
      const cabinSet = detectCabinLocations(blob);
      const cabins: string[] = [];
      if (cabinSet.has("paradis")) cabins.push("Paradis");
      if (cabinSet.has("fjord")) cabins.push("Fjordgløtt");
      return {
        id: e.id,
        title: e.title,
        category: e.category,
        start_date: e.start_date,
        end_date: e.end_date,
        description: e.description ?? null,
        cabins, // [] | ["Paradis"] | ["Fjordgløtt"] | ["Paradis","Fjordgløtt"]
        search: blob.replace(/\s+/g, " ").trim(), // normalisert lowercase-tekst
      };
    };
    const allEntries = [
      ...(entries as RawEntry[]).map(enrich),
      ...holidays.map(enrich),
    ];

    const today = new Date().toISOString().slice(0, 10);
    const gateway = createLovableAiGatewayProvider(apiKey);
    // Rask modell med moderne resonneringsevne – mye raskere enn 2.5-pro,
    // samtidig sterk nok til semantisk tolkning og fuzzy navnematching.
    const model = gateway("google/gemini-3.5-flash");

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
    const userLine = (ctx as { userName?: string; userRole?: string }).userName
      ? `Pålogget bruker: ${(ctx as { userName?: string }).userName} (${(ctx as { userRole?: string }).userRole ?? "admin"}).`
      : "Pålogget bruker: ukjent.";

    // Bygg en lett "glossar" over kjente entiteter i kalenderen slik at modellen
    // kan fuzzy-matche navn (f.eks. "morten" → "Mortens familie") uten å gjette.
    const nameTokens = new Map<string, number>();
    const PLACE_RE = /paradis|fjordgl(ø|o)tt|fjordglott/i;
    const STOPWORDS = new Set([
      "og","på","i","til","fra","med","hos","for","de","den","det","en","et","av","om","som","er","var","skal","har","ikke","ved","etter","før","som","seg","sin","sitt","sine","vår","våre","oss","alle","noen","når","hva","hvor","hvem","hvilken","hvilke","hvordan","hytte","hytta","tur","helg","uke","ferie","dag","kveld","kveld","morgen","natt","kalender","arrangement","møte","fest","sommer","vinter","høst","vår","påske","jul","nyttår","st","kl","ca","ny","gammel","stor","liten","fri","ledig","opptatt","fullt","stengt","åpent","kommer","drar","reiser","ankommer","ankomst","avreise","besøk","besøker","barn","barna","familie","familien","mamma","pappa","mor","far","onkel","tante","bestemor","bestefar","farfar","farmor","morfar","mormor","oss","dem","seg",
    ]);
    for (const e of allEntries) {
      const text = `${e.title} ${e.description ?? ""}`;
      const tokens = text
        .split(/[^\p{L}\p{N}'-]+/u)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3 && !PLACE_RE.test(t));
      for (const raw of tokens) {
        const lower = raw.toLowerCase();
        if (STOPWORDS.has(lower)) continue;
        // Behold ord som starter med stor bokstav (sannsynlige navn) ELLER inneholder apostrof.
        const looksLikeName = /^[A-ZÆØÅ]/.test(raw) || raw.includes("'");
        if (!looksLikeName) continue;
        // Normaliser eieform: "Mortens" → "Morten" som hovedform, behold variant.
        const normalized = raw.replace(/[''']s?$|s$/u, "");
        if (normalized.length < 3) continue;
        nameTokens.set(normalized, (nameTokens.get(normalized) ?? 0) + 1);
      }
    }
    const knownNames = [...nameTokens.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([n]) => n);

    const system = [
      "Du er en hjelpsom assistent for Hyttekalender – en norsk familiekalender.",
      userLine,
      `Dagens dato er ${today}. Året er ${new Date().getFullYear()}.`,
      "",
      "DU ER EN SEMANTISK RESONNERINGSMOTOR – IKKE EN SØKEMOTOR.",
      "Forstå MENING og INTENSJON, ikke bare eksakte ord. Match navn og steder fuzzy. Ekspander vage uttrykk internt før du svarer.",
      "",
      "RESONNERINGSPROSESS (gjør dette internt for hvert spørsmål, ikke vis det i svaret):",
      "1. Trekk ut entiteter: personer (Morten, Vera, Jørgen, Sander, Farfar, barn, familie ...), steder (Paradis, Fjordgløtt, 'hytta' = begge), kategorier (cabin/event/highlight/holiday/note), tidsuttrykk (dato, måned, sesong, høytid, 'denne uka', 'i sommer').",
      "2. Ekspander vage uttrykk: 'på hytta' = category=cabin OG cabins inneholder Paradis ELLER Fjordgløtt. 'fri' = perioder UTEN bookinger i relevant kategori/sted. 'i sommer' = juni-august. 'til jul' = desember/julehøytid. 'familie' = alle familiemedlemmer.",
      "3. Søk i HELE KALENDERDATA – sjekk title, description, search (normalisert blob), cabins (utledet hyttested), category, datoer. Bruk delstrenger og fuzzy-match: 'morten' matcher alt som inneholder 'morten' (inkl. 'Mortens familie'). 'paradis' matcher entries der cabins inneholder 'Paradis'.",
      "4. Resonner over kombinasjoner: 'Morten på hytta i juli' = entries der search inneholder 'morten' OG category='cabin' OG datoer overlapper med juli.",
      "5. Velg ALLE meningsfulle treff – ikke bare det første. List dem kronologisk.",
      "",
      "SPØRSMÅL → TOLKNING (eksempler):",
      "- 'Når skal Morten på hytta' → person=Morten, kategori=cabin → finn alle cabin-entries der search inneholder 'morten'.",
      "- 'Hvem skal til Paradis' → sted=Paradis → finn alle entries der cabins inneholder 'Paradis', list personer/titler.",
      "- 'Når har Vera fri' → person=Vera → finn perioder UTEN Vera-relaterte entries i synlig periode.",
      "- 'Hva skjer i juli' → tid=juli (inneværende år hvis ikke spesifisert) → list alle entries som overlapper juli.",
      "- 'på hytta i sommer' → category=cabin OG måned ∈ {6,7,8}.",
      "",
      "Bare svar 'Fant ingen treff' når det virkelig ikke finnes NOEN meningsfull tolkning. Prøv minst 3 ekspansjoner først.",
      "ABSOLUTT FORBUDT å svare 'Fant ingen treff' uten først å ha:",
      "(a) sjekket KJENTE NAVN under for fuzzy-match (delstreng, første 3-4 bokstaver),",
      "(b) prøvd minst 3 ulike søkebegrep,",
      "(c) sett om noen entries overlapper tidsrommet uansett person.",
      "Hvis du fortsatt ikke finner noe: foreslå 2-3 omformuleringer i 'suggestions' som faktisk refererer ekte navn/steder/datoer fra KALENDERDATA – aldri fiktive.",
      "",
      `KJENTE NAVN OG ENTITETER i kalenderen (bruk for fuzzy-match): ${knownNames.length ? knownNames.join(", ") : "(ingen navn registrert ennå)"}.`,
      "Eksempel: bruker skriver 'morten'. Søk i KJENTE NAVN, finn 'Morten', match alle entries der search inneholder 'morten' (inkl. eieformer som 'Mortens').",
      "",
      "SVARSTIL – VIKTIG:",
      "- Vær KORT, ROLIG og MENNESKELIG. Maks 1–4 linjer for vanlige svar.",
      "- Ingen pyntetegn: ikke bruk •, ●, →, =>, ---, ***, ###, ** eller emojis.",
      "- Ikke bruk markdown-overskrifter eller fete typer. Vanlig tekst.",
      "- For lister med flere oppføringer: én oppføring per linje, formatet 'Tittel: dato' eller 'dato – Tittel'. Ingen punktmerker foran.",
      "- Datoer på norsk: '12–15 juli', '17. mai', '2 august'. Ingen ekstra årstall hvis det er i år.",
      "- Aldri svar 'jeg forstår ikke' – gjør et søk, gjett beste tolkning, eller foreslå omformuleringer.",
      "",
      "SAMTALE: Bruk historikken for å løse korte oppfølgere ('de', 'da', 'samme helg', 'hva med august'). Brukeren skal slippe å gjenta navn/datoer.",
      "Bruk alltid LIVE kalenderdata – aldri henvis til oppføringer som ikke finnes.",
      "",
      "AKTIV KONTEKST I APPEN (bruk for å tolke 'denne uka', 'denne måneden', 'nå'):",
      `- Modus: ${ctx.view ?? "modern"}.`,
      `- Synlig måned: ${ctx.visibleMonth ?? "–"}. Synlig år: ${ctx.visibleYear ?? new Date().getFullYear()}.`,
      `- Aktive filter: ${(ctx.activeFilters && ctx.activeFilters.length ? ctx.activeFilters.join(", ") : "ingen")}.`,
      `- Aktive hyttesteder: ${(ctx.activeCabinLocations && ctx.activeCabinLocations.length ? ctx.activeCabinLocations.join(", ") : "alle")}.`,
      "",
      "BEGREPER: Kategorier = cabin (Hytte: Paradis/Fjordgløtt), event, highlight (inkl. bursdager), note, holiday (norske helligdager).",
      "",
      "Tål skrivefeil, dialekt, små bokstaver, uformell norsk. Fuzzy-match på navn og steder ('morten' = 'Mortens familie', 'fjordglot' = 'Fjordgløtt').",
      "Norske månedsnavn og forkortelser. '12 til 15 juli' = 12–15 juli inneværende år.",
      "Hvis brukeren vil legge til noe: sett intent='create' og fyll ut draft (title, category, start_date, end_date YYYY-MM-DD). Lag en kort, ryddig tittel. La 'description' være tom om unødvendig.",
      "Søk i HELE KALENDERDATA (titler og beskrivelser). Fuzzy/delmatch. List ALLE relevante treff.",
      "Tolk relative tidsuttrykk fra dagens dato og synlig måned: 'denne uka', 'neste helg', 'i sommer', 'til jul', 'i fjor'.",
      "Når svaret refererer til konkrete oppføringer: list deres 'id' i 'matched_ids'. Bare ekte id-er fra KALENDERDATA.",
      "Hvis ingenting matcher: kort svar + 2–3 omformuleringer i 'suggestions'.",
      "",
      "EKSEMPLER PÅ SVARFORMAT:",
      "Spm: 'Når skal Morten på hytta?'",
      "Svar:",
      "Mortens familie på Paradis: 12–15 juli",
      "Mortens familie på Fjordgløtt: 2–4 august",
      "",
      "Spm: 'Hva skjer 17 mai?'",
      "Svar:",
      "17. mai:",
      "Nasjonaldag",
      "Familiegrilling hos Morten",
      "",
      "Svar ALLTID på norsk. ALDRI på engelsk.",
      "",
      `KALENDERDATA (JSON, ${allEntries.length} oppføringer – LIVE fra databasen + genererte høytider):`,
      "Felter: id, title, category, start_date, end_date, description, cabins (utledet liste: [] | ['Paradis'] | ['Fjordgløtt'] | begge), search (lowercase-normalisert tekst for matching).",
      JSON.stringify(allEntries),
    ].join("\n");

    try {
      const history = (data as { history?: { role: "user" | "assistant"; content: string }[] }).history ?? [];
      const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: data.query },
      ];
      const { experimental_output } = await generateText({
        model,
        system,
        messages,
        experimental_output: Output.object({ schema: ResultSchema }),
      });
      return experimental_output;
    } catch (err) {
      console.error("[assistant] schema/parse error:", err);
      return fallback;
    }
  });