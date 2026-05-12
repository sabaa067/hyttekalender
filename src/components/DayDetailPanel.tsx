import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Pencil, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  type CalendarEntry,
  deleteEntry,
  toISODate,
  entryCoversDate,
  parseISODate,
} from "@/lib/entries";
import { getEntryVisual } from "@/lib/categories";

type Props = {
  date: Date | null;
  entries: CalendarEntry[];
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onEdit: (entry: CalendarEntry) => void;
};

export function DayDetailPanel({ date, entries, onOpenChange, onAdd, onEdit }: Props) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Slettet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!date) return null;
  const iso = toISODate(date);
  const day = entries.filter((e) => entryCoversDate(e, iso));
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const isPast = date.getTime() < todayStart.getTime();

  return (
    <Dialog open={!!date} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl capitalize">
            {format(date, "EEEE d. MMMM yyyy", { locale: nb })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {day.length === 0 && (
            <p className="rounded-2xl bg-secondary/40 p-5 text-center text-base text-muted-foreground">
              {isPast
                ? "Ser ikke ut som det er noe her ✨"
                : "Ingen arrangementer denne dagen"}
            </p>
          )}

          {day.map((e) => {
            const v = getEntryVisual(e);
            const Icon = v.icon;
            const sameDay = e.start_date === e.end_date;
            return (
              <div
                key={e.id}
                className={cn("rounded-2xl p-4", v.soft)}
              >
                <div className="flex items-start gap-3">
                  <Icon className="mt-1 h-5 w-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold">{e.title}</p>
                    <p className="text-sm opacity-80">
                      {v.label}
                      {" · "}
                      {sameDay
                        ? format(parseISODate(e.start_date), "d. MMM yyyy", { locale: nb })
                        : `${format(parseISODate(e.start_date), "d. MMM", { locale: nb })} – ${format(parseISODate(e.end_date), "d. MMM yyyy", { locale: nb })}`}
                    </p>
                    {e.description && (
                      <p className="mt-2 text-sm whitespace-pre-wrap">{e.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => onEdit(e)}
                      aria-label="Rediger"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => del.mutate(e.id)}
                      disabled={del.isPending}
                      aria-label="Slett"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          {!isPast && (
            <Button size="lg" className="w-full rounded-2xl text-base" onClick={onAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Ny oppføring
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}