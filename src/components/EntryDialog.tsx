import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date | null;
  entry?: CalendarEntry | null;
};

export function EntryDialog({ open, onOpenChange, initialDate, entry }: Props) {
  const [category, setCategory] = useState<Category>("cabin");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const qc = useQueryClient();
  const isEdit = !!entry;

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setCategory(entry.category);
      setTitle(entry.title);
      setDescription(entry.description ?? "");
      setStart(parseISODate(entry.start_date));
      setEnd(parseISODate(entry.end_date));
    } else {
      setCategory("cabin");
      setTitle("");
      setDescription("");
      setStart(initialDate ?? new Date());
      setEnd(initialDate ?? new Date());
    }
  }, [open, initialDate, entry]);

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
      if (entry) await updateEntry(entry.id, payload);
      else await createEntry(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      toast.success(isEdit ? "Lagret" : "Lagt til");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit =
    title.trim().length > 0 && start && end && end >= start && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? "Rediger" : "Ny oppføring"}
          </DialogTitle>
          <DialogDescription className="text-base">
            Legg til hytteopphold, bursdag, arrangement eller høydepunkt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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

          <div className="grid grid-cols-2 gap-3">
            <DateField label="Fra" date={start} onChange={setStart} />
            <DateField label="Til" date={end} onChange={setEnd} minDate={start} />
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

        <DialogFooter className="gap-2 sm:gap-2">
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

function DateField({
  label,
  date,
  onChange,
  minDate,
}: {
  label: string;
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
  minDate?: Date;
}) {
  return (
    <div>
      <p className="mb-2 text-base font-medium text-foreground">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className={cn(
              "w-full justify-start rounded-2xl text-base font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "d. MMM yyyy", { locale: nb }) : "Velg dato"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onChange}
            disabled={minDate ? (d) => d < minDate : undefined}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}