import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { CATEGORIES, CATEGORY_META, type Category } from "@/lib/categories";
import {
  createEntry,
  updateEntry,
  toISODate,
  parseISODate,
  type CalendarEntry,
} from "@/lib/entries";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date | null;
  entry?: CalendarEntry | null;
  draft?: Partial<CalendarEntry> | null;
};

export function EntryDialog({ open, onOpenChange, initialDate, entry, draft }: Props) {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("cabin");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const qc = useQueryClient();
  const isEdit = !!entry;
  const start = range?.from;
  const end = range?.to ?? range?.from;

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setCategory(entry.category);
      setTitle(entry.title);
      setDescription(entry.description ?? "");
      setRange({ from: parseISODate(entry.start_date), to: parseISODate(entry.end_date) });
    } else if (draft) {
      setCategory((draft.category as Category) ?? "cabin");
      setTitle(draft.title ?? "");
      setDescription(draft.description ?? "");
      const from = draft.start_date ? parseISODate(draft.start_date) : (initialDate ?? new Date());
      const to = draft.end_date ? parseISODate(draft.end_date) : from;
      setRange({ from, to });
    } else {
      setCategory("cabin");
      setTitle("");
      setDescription("");
      const d = initialDate ?? new Date();
      setRange({ from: d, to: d });
    }
  }, [open, initialDate, entry, draft]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!start || !end) throw new Error("Velg datoer");
      const payload = {
        title: title.trim(),
        category,
        start_date: toISODate(start),
        end_date: toISODate(end),
        description: description.trim() || null,
      };
      if (entry) {
        await updateEntry(entry.id, payload);
        await logActivity({
          actor: user,
          action: "update",
          entry: { title: payload.title, category, start_date: payload.start_date, end_date: payload.end_date },
        });
      } else {
        await createEntry(payload);
        await logActivity({
          actor: user,
          action: "create",
          entry: { title: payload.title, category, start_date: payload.start_date, end_date: payload.end_date },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success(isEdit ? "Lagret" : "Lagt til");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit =
    title.trim().length > 0 && !!start && !!end && end >= start && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl flex max-h-[90vh] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6">
          <DialogTitle className="text-2xl">
            {isEdit ? "Rediger" : "Ny oppføring"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Legg til hytteopphold, bursdag, arrangement eller høydepunkt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div>
            <p className="mb-3 text-base font-medium text-foreground">Kategori</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const m = CATEGORY_META[c];
                const Icon = m.icon;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl p-3 text-base font-medium transition-all",
                      m.soft,
                      category === c
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                        : "opacity-70 hover:opacity-100",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-base font-medium text-foreground">Tittel</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Påske, Jakthelg, Bursdag Ole"
              className="h-12 rounded-2xl text-base"
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-base font-medium text-foreground">Datoer</p>
              <p className="text-sm text-muted-foreground">
                {start && end
                  ? start.getTime() === end.getTime()
                    ? format(start, "d. MMM yyyy", { locale: nb })
                    : `${format(start, "d. MMM", { locale: nb })} – ${format(end, "d. MMM yyyy", { locale: nb })}`
                  : start
                    ? `${format(start, "d. MMM yyyy", { locale: nb })} – velg sluttdato`
                    : "Velg startdato"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-2">
              <Calendar
                mode="range"
                selected={range as any}
                onSelect={(r: any) => setRange(r ?? undefined)}
                defaultMonth={start ?? new Date()}
                numberOfMonths={1}
                locale={nb}
                className={cn("p-2 pointer-events-auto mx-auto")}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-base font-medium text-foreground">
              Beskrivelse <span className="text-muted-foreground">(valgfritt)</span>
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort notat"
              className="min-h-[80px] rounded-2xl text-base"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-background px-6 py-4 sm:gap-2 rounded-b-3xl">
          <Button
            variant="ghost"
            size="lg"
            className="rounded-2xl text-base"
            onClick={() => onOpenChange(false)}
          >
            Avbryt
          </Button>
          <Button
            size="lg"
            className="rounded-2xl text-base"
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {isEdit ? "Lagre" : "Legg til"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}