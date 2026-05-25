import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateHolidaysForYears } from "./holidays";
import { detectCabinLocations } from "./categories";

type RawEntry = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  description?: string | null;
};

type IndexedEntry = RawEntry & {
  cabins: string[];
  search: string;
  normalizedSearch: string;
  normalizedCabins: string[];
};

const MONTHS: Record<string, number> = {
  januar: 1,
  jan: 1,
  februar: 2,
  feb: 2,
  mars: 3,
  april: 4,
  apr: 4,
  mai: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  oktober: 10,
  okt: 10,
  november: 11,
  nov: 11,
  desember: 12,
  des: 12,
};

const MONTH_LABELS = [
  "",
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

const QUERY_NON_ENTITY_WORDS = new Set([
  "nar",
  "hva",
  "hvem",
  "hvor",
  "hvordan",
  "pa",
  "til",
  "fra",
  "skal",
  "kommer",
  "reiser",
  "drar",
  "neste",
  "vis",
  "finn",
  "fortell",
  "liste",
  "list",
  "alle",
  "hytte",
  "hytta",
  "hytten",
  "hyttetur",
  "hytteturer",
  "paradis",
  "fjord",
  "fjordglott",
  "fri",
  "ledig",
  "ledige",
  "sommer",
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemNorwegianName(value: string): string {
  const n = normalizeText(value);
  return n.endsWith("s") && n.length > 4 ? n.slice(0, -1) : n;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  const target = stemNorwegianName(needle);
  if (target.length < 3) return false;
  if (haystack.includes(target) || haystack.includes(`${target}s`)) return true;
  const words = haystack.split(/\s+/).map(stemNorwegianName);
  return words.some((w) => w === target || w.startsWith(target) || target.startsWith(w) || editDistance(w, target) <= 1);
}

function formatDateRange(start: string, end: string, currentYear: number): string {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const startLabel = `${sd}${sm === em && sy === ey ? "" : ` ${MONTH_LABELS[sm]}`}`;
  const endLabel = `${ed} ${MONTH_LABELS[em]}`;
  const yearLabel = sy === currentYear && ey === currentYear ? "" : ` ${ey}`;
  if (start === end) return `${sd}. ${MONTH_LABELS[sm]}${sy === currentYear ? "" : ` ${sy}`}`;
  return `${startLabel}–${endLabel}${yearLabel}`;
}

function overlapsRange(entry: RawEntry, start: string, end: string): boolean {
  return entry.start_date <= end && entry.end_date >= start;
}

function extractTimeRange(query: string, visibleYear?: number): { start: string; end: string; label: string } | null {
  const q = normalizeText(query);
  const yearMatch = q.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : (visibleYear ?? new Date().getFullYear());
  if (/\bsommer(en)?\b/.test(q)) return { start: `${year}-06-01`, end: `${year}-08-31`, label: "i sommer" };
  for (const [name, month] of Object.entries(MONTHS)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) {
      const last = new Date(year, month, 0).getDate();
      return { start: `${year}-${String(month).padStart(2, "0")}-01`, end: `${year}-${String(month).padStart(2, "0")}-${last}`, label: MONTH_LABELS[month] };
    }
  }
  const dayMonth = q.match(/\b(\d{1,2})\s*\.?\s*(januar|jan|februar|feb|mars|april|apr|mai|juni|jun|juli|jul|august|aug|september|sep|oktober|okt|november|nov|desember|des)\b/);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTHS[dayMonth[2]];
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { start: iso, end: iso, label: `${day}. ${MONTH_LABELS[month]}` };
  }
  return null;
}

function buildDirectReply(entries: IndexedEntry[], currentYear: number, prefix?: string): string {
  const lines = entries.slice(0, 12).map((e) => `${e.title}: ${formatDateRange(e.start_date, e.end_date, currentYear)}`);
  if (entries.length > 12) lines.push(`I tillegg finnes ${entries.length - 12} flere treff.`);
  return [prefix, ...lines].filter(Boolean).join("\n");
}

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
        "Jeg klarte ikke hente et trygt svar akkurat nå. Prøv igjen om litt.",
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
    const enrich = (e: RawEntry): IndexedEntry => {
      const blob = `${e.title} ${e.description ?? ""}`.toLowerCase();
      const cabinSet = detectCabinLocations(blob);
      const cabins: string[] = [];
      if (cabinSet.has("paradis")) cabins.push("Paradis");
      if (cabinSet.has("fjord")) cabins.push("Fjordgløtt");
      const search = blob.replace(/\s+/g, " ").trim();
      return {
        id: e.id,
        title: e.title,
        category: e.category,
        start_date: e.start_date,
        end_date: e.end_date,
        description: e.description ?? null,
        cabins, // [] | ["Paradis"] | ["Fjordgløtt"] | ["Paradis","Fjordgløtt"]
        search,
        normalizedSearch: normalizeText(`${e.title} ${e.description ?? ""} ${e.category} ${cabins.join(" ")}`),
        normalizedCabins: cabins.map(normalizeText),
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
    const model = gateway("openai/gpt-4.1-mini");

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
    const normalizedStopwords = new Set([...STOPWORDS].map(normalizeText));
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

    const qNorm = normalizeText(data.query);
    const queryWords = qNorm.split(/\s+/).filter((w) => w.length >= 3 && !normalizedStopwords.has(w));
    const wantsCabin = /\b(hytte|hytta|hytten|hyttetur|hytteturer|paradis|fjordglott|fjord)\b/.test(qNorm);
    const wantsAvailability = /\b(fri|ledig|ledige|aapen|apen|available)\b/.test(qNorm);
    const wantsFuture = /\b(nar|skal|kommer|reiser|drar|neste|fremover|framtid|future)\b/.test(qNorm);
    const isCreateIntent = /\b(legg inn|legg til|opprett|registrer|lag|sett inn)\b/.test(qNorm);
    const placeFilters = [
      /\bparadis\b/.test(qNorm) ? "paradis" : null,
      /\bfjord(glott)?\b/.test(qNorm) ? "fjordglott" : null,
    ].filter(Boolean) as string[];
    const timeRange = extractTimeRange(data.query, ctxYear);
    const matchedNames = knownNames.filter((name) => fuzzyIncludes(qNorm, name));
    const inferredNameWords = matchedNames.length
      ? matchedNames
      : queryWords.filter((word) => !QUERY_NON_ENTITY_WORDS.has(word) && !MONTHS[word]);
    const hasEntityIntent = wantsCabin || wantsAvailability || timeRange || matchedNames.length > 0 || placeFilters.length > 0;

    const retrieved = allEntries
      .map((entry) => {
        let score = 0;
        if (inferredNameWords.length) {
          const nameHits = inferredNameWords.filter((name) => fuzzyIncludes(entry.normalizedSearch, name)).length;
          if (!nameHits) return null;
          if (wantsCabin) {
            const onlyMarkedUnavailable = inferredNameWords.some((name) => {
              const n = stemNorwegianName(name);
              return entry.normalizedSearch.includes(`${n} jobber`) && !new RegExp(`\\b${n}\\s+(m|med|familie)\\b`).test(entry.normalizedSearch);
            });
            if (onlyMarkedUnavailable) return null;
          }
          score += nameHits * 35;
        }
        if (wantsCabin) {
          if (entry.category === "cabin") score += 30;
          if (entry.normalizedCabins.length) score += 12;
          if (entry.category !== "cabin" && !entry.normalizedCabins.length) return null;
        }
        if (placeFilters.length) {
          const placeHit = placeFilters.some((place) => entry.normalizedCabins.some((c) => c.includes(place)) || entry.normalizedSearch.includes(place));
          if (!placeHit) return null;
          score += 28;
        }
        if (timeRange) {
          if (!overlapsRange(entry, timeRange.start, timeRange.end)) return null;
          score += 22;
        }
        for (const word of queryWords) {
          if (fuzzyIncludes(entry.normalizedSearch, word)) score += 5;
        }
        if (wantsFuture && entry.end_date >= today) score += 8;
        return score > 0 ? { entry, score } : null;
      })
      .filter((item): item is { entry: IndexedEntry; score: number } => Boolean(item))
      .sort((a, b) => b.score - a.score || a.entry.start_date.localeCompare(b.entry.start_date));

    const focusedMatches = retrieved
      .filter((item) => !wantsFuture || item.entry.end_date >= today || retrieved.every((r) => r.entry.end_date < today))
      .sort((a, b) => a.entry.start_date.localeCompare(b.entry.start_date))
      .map((item) => item.entry);

    const deterministicAnswer = hasEntityIntent && focusedMatches.length > 0 && !wantsAvailability && !isCreateIntent
      ? {
          intent: "answer" as const,
          reply: buildDirectReply(focusedMatches, nowYear),
          matched_ids: focusedMatches.map((e) => e.id),
          suggestions: ["Vis flere hytteturer", "Hva skjer samme helg?", "Hvem er på hytta i sommer?"],
        }
      : null;

    if (deterministicAnswer) return deterministicAnswer;

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
      `FORHÅNDSHENTET RELEVANT KALENDERKONTEKST for dette spørsmålet (${focusedMatches.length} treff):`,
      JSON.stringify(focusedMatches.slice(0, 40)),
      "Bruk disse treffene først. De er allerede fuzzy-/semantisk rangert fra live kalenderdata.",
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