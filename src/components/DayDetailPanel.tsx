import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Pencil, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

type Props = {
  date: Date | null;
  entries: CalendarEntry[];
  onOpenChange: (open: boolean) => void;
  onDateChange: (date: Date) => void;
  onAdd: () => void;
  onEdit: (entry: CalendarEntry) => void;
};

export function DayDetailPanel({ date, entries, onOpenChange, onDateChange, onAdd, onEdit }: Props) {
  const { user } = useAuth();
  const canEdit = user?.role === "admin";
  const qc = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<CalendarEntry | null>(null);

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null);

  const del = useMutation({
    mutationFn: async (e: CalendarEntry) => {
      await deleteEntry(e.id);
      await logActivity({
        actor: user,
        action: "delete",
        entry: { title: e.title, category: e.category, start_date: e.start_date, end_date: e.end_date },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
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

  const goPrev = () => onDateChange(subDays(date, 1));
  const goNext = () => onDateChange(addDays(date, 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  return (
    <>
      <Dialog open={!!date} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-md rounded-3xl"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl shrink-0 h-8 w-8 p-0"
                onClick={goPrev}
                aria-label="Forrige dag"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <DialogTitle className="flex-1 text-center text-xl capitalize leading-tight">
                {format(date, "EEEE d. MMMM yyyy", { locale: nb })}
              </DialogTitle>

              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl shrink-0 h-8 w-8 p-0"
                onClick={goNext}
                aria-label="Neste dag"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {day.length === 0 && (
              <p className="rounded-2xl bg-secondary/40 p-5 text-center text-base text-muted-foreground">
                {isPast
                  ? "Ser ikke ut som det er noe her ✨"
                  : "Ingen oppføringer denne dagen"}
              </p>
            )}

            {day.map((e) => {
              const v = getEntryVisual(e);
              const Icon = v.icon;
              const sameDay = e.start_date === e.end_date;
              return (
                <div key={e.id} className={cn("rounded-2xl p-4", v.soft)}>
                  <div className="flex items-start gap-3">
                    <Icon className="mt-1 h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold">{e.title}</p>
                      <p className="text-sm opacity-80">
                        {v.label}
                        {e.category === "note" && e.created_by && (
                          <>
                            {" • "}
                            <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-xs font-medium">
                              {e.created_by}
                            </span>
                          </>
                        )}
                        {" · "}
                        {sameDay
                          ? format(parseISODate(e.start_date), "d. MMM yyyy", { locale: nb })
                          : `${format(parseISODate(e.start_date), "d. MMM", { locale: nb })} – ${format(parseISODate(e.end_date), "d. MMM yyyy", { locale: nb })}`}
                      </p>
                      {e.description && (
                        <p className="mt-2 text-sm whitespace-pre-wrap">{e.description}</p>
                      )}
                    </div>
                    {canEdit && (
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
                          onClick={() => setPendingDelete(e)}
                          disabled={del.isPending}
                          aria-label="Slett"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            {!isPast && canEdit && (
              <Button size="lg" className="w-full rounded-2xl text-base" onClick={onAdd}>
                <Plus className="mr-1 h-4 w-4" />
                Ny oppføring
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Vil du virkelig slette?</AlertDialogTitle>
            <AlertDialogDescription>
              «{pendingDelete?.title}» vil bli slettet permanent og kan ikke gjenopprettes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Nei</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  del.mutate(pendingDelete);
                  setPendingDelete(null);
                }
              }}
            >
              Ja, slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
