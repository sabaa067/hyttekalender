import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2, Plus, Cake } from "lucide-react";

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
  type Booking,
  deleteBooking,
  toISODate,
  bookingCoversDate,
  parseISODate,
} from "@/lib/bookings";
import { personMeta } from "@/lib/persons";
import {
  type CalendarEvent,
  EVENT_META,
  deleteEvent,
  eventCoversDate,
} from "@/lib/events";

type Props = {
  date: Date | null;
  bookings: Booking[];
  events: CalendarEvent[];
  onOpenChange: (open: boolean) => void;
  onAddBooking: () => void;
  onAddEvent: () => void;
};

export function DayDetailDialog({
  date,
  bookings,
  events,
  onOpenChange,
  onAddBooking,
  onAddEvent,
}: Props) {
  const qc = useQueryClient();

  const delBooking = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking slettet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delEvt = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Hendelse slettet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!date) return null;
  const iso = toISODate(date);
  const dayBookings = bookings.filter((b) => bookingCoversDate(b, iso));
  const dayEvents = events.filter((e) => eventCoversDate(e, iso));
  const isEmpty = dayBookings.length === 0 && dayEvents.length === 0;

  return (
    <Dialog open={!!date} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl capitalize">
            {format(date, "EEEE d. MMMM yyyy", { locale: nb })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isEmpty && (
            <p className="rounded-2xl bg-secondary/40 p-5 text-center text-base text-muted-foreground">
              Ingen bookinger eller hendelser denne dagen.
            </p>
          )}

          {dayBookings.map((b) => {
            const meta = personMeta(b.person);
            const sameDay = b.start_date === b.end_date;
            return (
              <div
                key={b.id}
                className={cn("flex items-start gap-3 rounded-2xl p-4", meta.soft)}
              >
                <span className={cn("mt-1.5 h-4 w-4 shrink-0 rounded-full", meta.color)} />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{meta.label} på hytta</p>
                  <p className="text-sm text-muted-foreground">
                    {sameDay
                      ? format(parseISODate(b.start_date), "d. MMM yyyy", { locale: nb })
                      : `${format(parseISODate(b.start_date), "d. MMM", { locale: nb })} – ${format(parseISODate(b.end_date), "d. MMM yyyy", { locale: nb })}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => delBooking.mutate(b.id)}
                  disabled={delBooking.isPending}
                  aria-label="Slett booking"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          {dayEvents.map((e) => {
            const meta = EVENT_META[e.type];
            const Icon = meta.icon;
            return (
              <div
                key={e.id}
                className={cn("flex items-start gap-3 rounded-2xl p-4", meta.soft)}
              >
                <Icon className="mt-1 h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-lg font-semibold">{e.title}</p>
                  <p className="text-sm opacity-80">{meta.label}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => delEvt.mutate(e.id)}
                  disabled={delEvt.isPending}
                  aria-label="Slett hendelse"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="lg"
            className="rounded-2xl text-base"
            onClick={onAddEvent}
          >
            <Cake className="mr-1 h-4 w-4" />
            Ny hendelse
          </Button>
          <Button size="lg" className="rounded-2xl text-base" onClick={onAddBooking}>
            <Plus className="mr-1 h-4 w-4" />
            Ny booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}