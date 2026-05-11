import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2 } from "lucide-react";

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

import { type Booking, deleteBooking, parseISODate } from "@/lib/bookings";
import { personMeta } from "@/lib/persons";

type Props = {
  booking: Booking | null;
  onOpenChange: (open: boolean) => void;
};

export function BookingDetailsDialog({ booking, onOpenChange }: Props) {
  const [confirming, setConfirming] = useState(false);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking slettet");
      setConfirming(false);
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!booking) return null;
  const meta = personMeta(booking.person);
  const start = parseISODate(booking.start_date);
  const end = parseISODate(booking.end_date);
  const sameDay = booking.start_date === booking.end_date;

  return (
    <Dialog open={!!booking} onOpenChange={(o) => { if (!o) { setConfirming(false); onOpenChange(false); } }}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className={cn("flex items-center gap-3 rounded-2xl p-4", meta.soft)}>
            <span className={cn("h-5 w-5 rounded-full", meta.color)} />
            <span className="text-xl font-semibold">{meta.label}</span>
          </div>
          <div className="rounded-2xl bg-secondary/40 p-4 text-base">
            {sameDay ? (
              <p>
                <span className="text-muted-foreground">Dato: </span>
                <span className="font-medium">
                  {format(start, "EEEE d. MMMM yyyy", { locale: nb })}
                </span>
              </p>
            ) : (
              <>
                <p>
                  <span className="text-muted-foreground">Fra: </span>
                  <span className="font-medium">
                    {format(start, "EEEE d. MMMM yyyy", { locale: nb })}
                  </span>
                </p>
                <p className="mt-1">
                  <span className="text-muted-foreground">Til: </span>
                  <span className="font-medium">
                    {format(end, "EEEE d. MMMM yyyy", { locale: nb })}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {!confirming ? (
            <>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-2xl text-base"
                onClick={() => onOpenChange(false)}
              >
                Lukk
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-2xl text-base"
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Slett booking
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-2xl text-base"
                onClick={() => setConfirming(false)}
                disabled={mutation.isPending}
              >
                Avbryt
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="rounded-2xl text-base"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(booking.id)}
              >
                Ja, slett
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}