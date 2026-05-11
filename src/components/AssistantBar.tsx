import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askAssistant } from "@/lib/assistant.functions";
import { createEntry, parseISODate, type CalendarEntry } from "@/lib/entries";
import { CATEGORY_META, type Category } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Draft = {
  title: string;
  category: Category;
  start_date: string;
  end_date: string;
  description: string | null;
};

type Result = { intent: "create" | "answer"; reply: string; draft: Draft | null };

const PLACEHOLDERS = [
  "Hva skjer 17 mai?",
  "Legg inn hyttetur 12–15 juli",
  "Når skal Mortens familie på hytta?",
  "Hvilke arrangementer er i juli?",
];

type Props = {
  onEditDraft: (draft: Partial<CalendarEntry>) => void;
};

export function AssistantBar({ onEditDraft }: Props) {
  const ask = useServerFn(askAssistant);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);

  const askMut = useMutation({
    mutationFn: async (q: string) => (await ask({ data: { query: q } })) as Result,
    onSuccess: (r) => setResult(r),
    onError: (e: Error) => toast.error(e.message || "Klarte ikke å spørre"),
  });

  const publishMut = useMutation({
    mutationFn: async (d: Draft) => createEntry(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Lagt til");
      setResult(null);
      setQuery("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setResult(null);
    askMut.mutate(q);
  };

  const draft = result?.draft;

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

      {result && (
        <div className="mt-3 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base text-foreground whitespace-pre-wrap">{result.reply}</p>
            <button
              onClick={() => setResult(null)}
              className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
              aria-label="Lukk"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {result.intent === "create" && draft && (
            <div className="mt-3 space-y-3">
              <DraftPreview draft={draft} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  className="rounded-2xl"
                  disabled={publishMut.isPending}
                  onClick={() => publishMut.mutate(draft)}
                >
                  {publishMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publiser"}
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => {
                    onEditDraft(draft);
                    setResult(null);
                  }}
                >
                  Rediger
                </Button>
              </div>
            </div>
          )}
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