import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, X, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askAssistant } from "@/lib/assistant.functions";
import { createEntry, parseISODate, type CalendarEntry, type FilterKey, toISODate } from "@/lib/entries";
import { CATEGORY_META, getEntryVisual, type Category } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Draft = {
  title: string;
  category: Category;
  start_date: string;
  end_date: string;
  description: string | null;
};

type Result = {
  intent: "create" | "answer";
  reply: string;
  draft: Draft | null;
  matched_ids?: string[];
  suggestions?: string[];
};

type HistoryItem = {
  id: string;
  query: string;
  result: Result;
};

// Stripp dekorative tegn slik at AI-svar alltid føles rene og rolige.
function cleanReply(text: string): string {
  if (!text) return text;
  return text
    // Fjern vanlige punkt-/pil-/separator-symboler i start av linjer
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•●◦▪►▶→⇒»·]+|[-*]{2,}|={2,})\s*/u, "").trimEnd())
    .join("\n")
    // Fjern markdown-fete/kursiv-stjerner og overskrifter
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(?!\s)([^*\n]+?)\*(?=\s|$)/g, "$1$2")
    .replace(/^#{1,6}\s+/gm, "")
    // Komprimer tre+ tomlinjer til to
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PLACEHOLDERS = [
  "Hva skjer 17 mai?",
  "Legg inn hyttetur 12–15 juli",
  "Når skal Mortens familie på hytta?",
  "Hvilke arrangementer er i juli?",
];

type Props = {
  entries: CalendarEntry[];
  onEditDraft: (draft: Partial<CalendarEntry>) => void;
  onOpenEvent: (entry: CalendarEntry) => void;
  context?: {
    view: "modern" | "overview" | "excel";
    visibleMonth: Date;
    visibleYear: number;
    activeFilters: Set<FilterKey>;
    activeCabinLocations: Set<"paradis" | "fjord">;
    showHolidays: boolean;
  };
};

export function AssistantBar({ entries, onEditDraft, onOpenEvent, context }: Props) {
  const ask = useServerFn(askAssistant);
  const qc = useQueryClient();
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  const askMut = useMutation({
    mutationFn: async (vars: { q: string; itemId: string }) => {
      const ctx = context
        ? {
            today: toISODate(new Date()),
            view: context.view,
            visibleMonth: `${context.visibleMonth.getFullYear()}-${String(context.visibleMonth.getMonth() + 1).padStart(2, "0")}`,
            visibleYear: context.visibleYear,
            activeFilters: Array.from(context.activeFilters),
            activeCabinLocations: Array.from(context.activeCabinLocations),
            showHolidays: context.showHolidays,
            userName: user?.name,
            userRole: user?.role,
            // Forhåndsindeksert kalender sendes med – server slipper DB-rundtur og svar blir raskere.
            entries: entries.map((e) => ({
              id: e.id,
              title: e.title,
              category: e.category,
              start_date: e.start_date,
              end_date: e.end_date,
              description: e.description,
            })),
          }
        : undefined;
      // Bygg samtalehistorikk fra eldste til nyeste (siste 6 turer = 12 meldinger)
      const turns = history
        .filter((it) => it.id !== vars.itemId && it.result.reply)
        .slice(0, 6)
        .reverse();
      const hist: { role: "user" | "assistant"; content: string }[] = [];
      for (const t of turns) {
        hist.push({ role: "user", content: t.query });
        hist.push({ role: "assistant", content: t.result.reply });
      }
      const r = (await ask({ data: { query: vars.q, context: ctx, history: hist } })) as Result;
      const cleaned: Result = { ...r, reply: cleanReply(r.reply ?? "") };
      return { ...vars, result: cleaned };
    },
    onSuccess: ({ itemId, result }) => {
      setHistory((h) => h.map((it) => (it.id === itemId ? { ...it, result } : it)));
    },
    onError: (_e, vars) => {
      const r: Result = {
        intent: "answer",
        reply: "Jeg fikk ikke helt tak i det. Prøv et av forslagene under.",
        draft: null,
        suggestions: [
          "Hva skjer 17. mai?",
          "Når er Mortens familie på Paradis?",
          "Vis alle hytteturer i juli",
        ],
      };
      setHistory((h) => h.map((it) => (it.id === vars.itemId ? { ...it, result: r } : it)));
    },
  });

  const publishMut = useMutation({
    mutationFn: async (vars: { draft: Draft; itemId: string }) => {
      const created = await createEntry(vars.draft);
      await logActivity({
        actor: user,
        action: "create",
        entry: {
          title: vars.draft.title,
          category: vars.draft.category,
          start_date: vars.draft.start_date,
          end_date: vars.draft.end_date,
        },
      });
      return created;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success("Lagt til");
      setHistory((h) => h.filter((it) => it.id !== vars.itemId));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ask_ = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const itemId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const placeholderResult: Result = { intent: "answer", reply: "", draft: null };
    setHistory((h) => [{ id: itemId, query: trimmed, result: placeholderResult }, ...h]);
    setExpandedId(itemId);
    setQuery("");
    askMut.mutate({ q: trimmed, itemId });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ask_(query);
  };

  const newest = history[0];
  const older = history.slice(1);

  return (
    <div className="rounded-3xl bg-card p-3 shadow-sm sm:p-4">
      <form onSubmit={submit} className="flex items-center gap-2">
        <Sparkles className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Spør kalenderen… f.eks. "${placeholder}"`}
          className="h-12 flex-1 rounded-2xl border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          disabled={askMut.isPending}
        />
        <Button
          type="submit"
          size="lg"
          disabled={askMut.isPending || query.trim().length === 0}
          className="h-12 rounded-2xl"
        >
          {askMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Spør"}
        </Button>
      </form>

      {newest && (
        <ExpandedCard
          item={newest}
          entries={entries}
          pending={askMut.isPending && askMut.variables?.itemId === newest.id}
          publishing={publishMut.isPending && publishMut.variables?.itemId === newest.id}
          onAsk={ask_}
          onPublish={(d) => publishMut.mutate({ draft: d, itemId: newest.id })}
          onEditDraft={(d) => {
            onEditDraft(d);
            setHistory((h) => h.filter((it) => it.id !== newest.id));
          }}
          onOpenEvent={onOpenEvent}
          onClose={() => setHistory((h) => h.filter((it) => it.id !== newest.id))}
          canEdit={canEdit}
        />
      )}

      {older.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            Historikk
          </div>
          {older.map((it) => {
            const open = expandedId === it.id;
            return (
              <div key={it.id} className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : it.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-secondary/60"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{it.query}</span>
                  {open ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
                {open && (
                  <div className="border-t border-border/60 p-3">
                    <ExpandedCard
                      item={it}
                      entries={entries}
                      pending={false}
                      publishing={publishMut.isPending && publishMut.variables?.itemId === it.id}
                      onAsk={ask_}
                      onPublish={(d) => publishMut.mutate({ draft: d, itemId: it.id })}
                      onEditDraft={(d) => {
                        onEditDraft(d);
                        setHistory((h) => h.filter((x) => x.id !== it.id));
                      }}
                      onOpenEvent={onOpenEvent}
                      embedded
                      canEdit={canEdit}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpandedCard({
  item,
  entries,
  pending,
  publishing,
  onAsk,
  onPublish,
  onEditDraft,
  onOpenEvent,
  onClose,
  embedded,
  canEdit,
}: {
  item: HistoryItem;
  entries: CalendarEntry[];
  pending: boolean;
  publishing: boolean;
  onAsk: (q: string) => void;
  onPublish: (d: Draft) => void;
  onEditDraft: (d: Draft) => void;
  onOpenEvent: (e: CalendarEntry) => void;
  onClose?: () => void;
  embedded?: boolean;
  canEdit?: boolean;
}) {
  const { result, query } = item;
  const draft = result.draft;
  const matched = (result.matched_ids ?? [])
    .map((id) => entries.find((e) => e.id === id))
    .filter((e): e is CalendarEntry => Boolean(e));

  return (
    <div
      className={cn(
        !embedded && "mt-3 rounded-2xl border border-border bg-background p-4",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{query}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
            aria-label="Lukk"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {pending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Tenker…
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-base text-foreground">{result.reply}</p>
      )}

      {result.suggestions && result.suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAsk(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {matched.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {matched.map((e) => {
            const v = getEntryVisual(e);
            const Icon = v.icon;
            const start = parseISODate(e.start_date);
            const end = parseISODate(e.end_date);
            const sameDay = e.start_date === e.end_date;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => onOpenEvent(e)}
                className="flex items-center gap-3 rounded-xl bg-card p-3 text-left transition-colors hover:bg-secondary"
              >
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", v.soft)}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{e.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {v.label} ·{" "}
                    {sameDay
                      ? format(start, "d. MMM yyyy", { locale: nb })
                      : `${format(start, "d. MMM", { locale: nb })} – ${format(end, "d. MMM yyyy", { locale: nb })}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {result.intent === "create" && draft && canEdit && (
        <div className="mt-3 space-y-3">
          <DraftPreview draft={draft} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              className="rounded-2xl"
              disabled={publishing}
              onClick={() => onPublish(draft)}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publiser"}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="rounded-2xl"
              onClick={() => onEditDraft(draft)}
            >
              Rediger
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftPreview({ draft }: { draft: Draft }) {
  const meta = CATEGORY_META[draft.category];
  const Icon = meta.icon;
  const start = parseISODate(draft.start_date);
  const end = parseISODate(draft.end_date);
  const sameDay = draft.start_date === draft.end_date;
  return (
    <div className="rounded-xl bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", meta.soft)}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-base font-semibold text-foreground">{draft.title}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {meta.label} ·{" "}
        {sameDay
          ? format(start, "d. MMM yyyy", { locale: nb })
          : `${format(start, "d. MMM", { locale: nb })} – ${format(end, "d. MMM yyyy", { locale: nb })}`}
      </p>
      {draft.description && (
        <p className="mt-2 text-sm text-foreground">{draft.description}</p>
      )}
    </div>
  );
}