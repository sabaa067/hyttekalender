import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfDay, startOfMonth, addYears, addMonths, isSameMonth, isBefore, max as dateMax } from "date-fns";
import type { DateRange } from "react-day-picker";
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
import { ChevronDown } from "lucide-react";

import {
  CATEGORY_META,
  CABIN_LOCATION_META,
  primaryCabinLocation,
  type Category,
} from "@/lib/categories";

type UiCategory = "paradis" | "fjord" | "event" | "highlight" | "note";
const UI_CATEGORIES: { key: UiCategory; label: string; color: string; soft: string; icon: typeof CATEGORY_META.event.icon }[] = [
  { key: "paradis", label: "Paradis", color: CABIN_LOCATION_META.paradis.color, soft: CABIN_LOCATION_META.paradis.soft, icon: CATEGORY_META.cabin.icon },
  { key: "fjord", label: "Fjordgløtt", color: CABIN_LOCATION_META.fjord.color, soft: CABIN_LOCATION_META.fjord.soft, icon: CATEGORY_META.cabin.icon },
  { key: "event", label: CATEGORY_META.event.label, color: CATEGORY_META.event.color, soft: CATEGORY_META.event.soft, icon: CATEGORY_META.event.icon },
  { key: "highlight", label: CATEGORY_META.highlight.label, color: CATEGORY_META.highlight.color, soft: CATEGORY_META.highlight.soft, icon: CATEGORY_META.highlight.icon },
  { key: "note", label: CATEGORY_META.note.label, color: CATEGORY_META.note.color, soft: CATEGORY_META.note.soft, icon: CATEGORY_META.note.icon },
];

function entryToUiCategory(entry: { category: Category; title: string; description?: string | null }): UiCategory {
  if (entry.category === "cabin") {
    const loc = primaryCabinLocation(`${entry.title} ${entry.description ?? ""}`);
    return loc === "fjord" ? "fjord" : "paradis";
  }
  if (entry.category === "birthday") return "highlight";
  if (entry.category === "highlight" || entry.category === "event" || entry.category === "note") return entry.category;
  return "event";
}
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
  const [uiCategory, setUiCategory] = useState<UiCategory>("paradis");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [calMonth, setCalMonth] = useState<Date>(() => new Date());
  const [monthPicker, setMonthPicker] = useState(false);
  const qc = useQueryClient();
  const isEdit = !!entry;
  const today = startOfDay(new Date());
  const maxDate = addYears(today, 2);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setUiCategory(entryToUiCategory(entry));
      setTitle(entry.title);
      setDescription(entry.description ?? "");
      const from = parseISODate(entry.start_date);
      const to = parseISODate(entry.end_date);
      setRange({ from, to });
      setCalMonth(from);
    } else if (draft) {
      setUiCategory(
        entryToUiCategory({
          category: (draft.category as Category) ?? "cabin",
          title: draft.title ?? "",
          description: draft.description ?? "",
        }),
      );
      setTitle(draft.title ?? "");
      setDescription(draft.description ?? "");
      const raw = draft.start_date ? parseISODate(draft.start_date) : (initialDate ?? new Date());
      const from = dateMax([raw, today]);
      const rawTo = draft.end_date ? parseISODate(draft.end_date) : from;
      const to = dateMax([rawTo, from]);
      setRange({ from, to });
      setCalMonth(from);
    } else {
      setUiCategory("paradis");
      setTitle("");
      setDescription("");
      const raw = initialDate ?? new Date();
      const d = dateMax([raw, today]);
      setRange({ from: d, to: d });
      setCalMonth(d);
    }
  }, [open, initialDate, entry, draft]);

  const mutation = useMutation({
    mutationFn: async () => {
      const from = range?.from;
      const to = range?.to ?? range?.from;
      if (!from || !to) throw new Error("Velg dato");
      const isCabin = uiCategory === "paradis" || uiCategory === "fjord";
      const cabinLabel =
        uiCategory === "paradis" ? "Paradis" : uiCategory === "fjord" ? "Fjordgløtt" : "";
      const category: Category = isCabin ? "cabin" : (uiCategory as Category);
      let finalTitle = title.trim();
      let finalDesc = description.trim();
      if (isCabin) {
        const haystack = `${finalTitle} ${finalDesc}`.toLowerCase();
        const hasLoc = uiCategory === "paradis"
          ? /paradis/.test(haystack)
          : /fjordgl(ø|o)tt|fjordglott/i.test(haystack);
        if (!hasLoc) finalTitle = `${cabinLabel} – ${finalTitle}`;
      }
      const payload = {
        title: finalTitle,
        category,
        start_date: toISODate(from),
        end_date: toISODate(to),
        description: finalDesc || null,
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
    title.trim().length > 0 &&
    !!range?.from &&
    !mutation.isPending;

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
              {UI_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = uiCategory === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setUiCategory(c.key)}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl p-3 text-base font-medium transition-all",
                      active ? cn(c.color, "shadow-md scale-[1.02]") : cn(c.soft, "opacity-70 hover:opacity-100"),
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {c.label}
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
                {range?.from
                  ? range.to && +range.to !== +range.from
                    ? `${format(range.from, "d. MMM", { locale: nb })} – ${format(range.to, "d. MMM yyyy", { locale: nb })}`
                    : format(range.from, "d. MMM yyyy", { locale: nb })
                  : "Velg datoer"}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-2">
              <div className="flex justify-center px-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMonthPicker((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold capitalize text-foreground transition-colors hover:bg-secondary"
                >
                  {format(calMonth, "LLLL yyyy", { locale: nb })}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 opacity-60 transition-transform",
                      monthPicker && "rotate-180",
                    )}
                  />
                </button>
              </div>
              {monthPicker ? (
                <InlineMonthPicker
                  value={calMonth}
                  today={today}
                  maxDate={maxDate}
                  onSelect={(d: Date) => {
                    setCalMonth(d);
                    setMonthPicker(false);
                  }}
                />
              ) : (
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(r) => r && setRange(r)}
                  month={calMonth}
                  onMonthChange={setCalMonth}
                  numberOfMonths={1}
                  locale={nb}
                  startMonth={startOfMonth(today)}
                  endMonth={maxDate}
                  disabled={{ before: today, after: maxDate }}
                  classNames={{ month_caption: "hidden", nav: "hidden" }}
                  className={cn("p-2 pointer-events-auto mx-auto")}
                />
              )}
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

function InlineMonthPicker({
  value,
  today,
  maxDate,
  onSelect,
}: {
  value: Date;
  today: Date;
  maxDate: Date;
  onSelect: (d: Date) => void;
}) {
  const months: Date[] = [];
  let cursor = startOfMonth(today);
  const end = startOfMonth(maxDate);
  while (!isBefore(end, cursor)) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  const byYear = new Map<number, Date[]>();
  for (const m of months) {
    const y = m.getFullYear();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(m);
  }
  return (
    <div className="max-h-[20rem] space-y-3 overflow-y-auto p-3 animate-in fade-in-50">
      {Array.from(byYear.entries()).map(([year, ms]) => (
        <div key={year}>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {year}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {ms.map((m) => {
              const active = isSameMonth(m, value);
              const isCurrent = isSameMonth(m, today);
              return (
                <button
                  key={m.toISOString()}
                  type="button"
                  onClick={() => onSelect(m)}
                  className={cn(
                    "rounded-xl px-2 py-2.5 text-sm font-medium capitalize transition-all",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : isCurrent
                      ? "bg-secondary text-foreground ring-1 ring-foreground/20"
                      : "bg-background text-foreground hover:bg-secondary",
                  )}
                >
                  {format(m, "LLL", { locale: nb })}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}