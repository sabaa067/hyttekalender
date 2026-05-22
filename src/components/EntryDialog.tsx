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
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>(undefined);
  const [calMonth, setCalMonth] = useState<Date>(() => new Date());
  const [monthPicker, setMonthPicker] = useState(false);
  const qc = useQueryClient();
  const isEdit = !!entry;
  const start = range?.from;
  const end = range?.to ?? range?.from;

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setUiCategory(entryToUiCategory(entry));
      setTitle(entry.title);
      setDescription(entry.description ?? "");
      const from = parseISODate(entry.start_date);
      setRange({ from, to: parseISODate(entry.end_date) });
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
      const from = draft.start_date ? parseISODate(draft.start_date) : (initialDate ?? new Date());
      const to = draft.end_date ? parseISODate(draft.end_date) : from;
      setRange({ from, to });
      setCalMonth(from);
    } else {
      setUiCategory("paradis");
      setTitle("");
      setDescription("");
      const d = initialDate ?? new Date();
      setRange({ from: d, to: d });
      setCalMonth(d);
    }
  }, [open, initialDate, entry, draft]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!start || !end) throw new Error("Velg datoer");
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
        start_date: toISODate(start),
        end_date: toISODate(end),
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
    !!start &&
    !!end &&
    end >= start &&
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
              <div className="flex justify-center px-2 pt-1">
                <Popover open={jumpOpen} onOpenChange={setJumpOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold capitalize text-foreground transition-colors hover:bg-secondary"
                    >
                      {format(calMonth, "LLLL yyyy", { locale: nb })}
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    className="w-[min(92vw,22rem)] rounded-2xl border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur"
                  >
                    <div className="mb-2 flex items-center justify-between px-1">
                      <p className="text-sm font-semibold text-foreground">Hopp til måned</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCalMonth(new Date());
                          setJumpOpen(false);
                        }}
                        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70"
                      >
                        I dag
                      </button>
                    </div>
                    <MonthJumper
                      monthDate={calMonth}
                      onSelect={(d) => {
                        setCalMonth(d);
                        setJumpOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Calendar
                mode="range"
                selected={range as any}
                onSelect={(r: any) => setRange(r ?? undefined)}
                month={calMonth}
                onMonthChange={setCalMonth}
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