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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { PERSONS, type Person } from "@/lib/persons";
import { createBooking, toISODate } from "@/lib/bookings";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date | null;
};

export function BookingDialog({ open, onOpenChange, initialDate }: Props) {
  const [person, setPerson] = useState<Person | null>(null);
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setPerson(null);
      setStart(initialDate ?? new Date());
      setEnd(initialDate ?? new Date());
    }
  }, [open, initialDate]);

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking lagret");
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit = person && start && end && end >= start && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Ny booking</DialogTitle>
          <DialogDescription className="text-base">
            Velg hvem som booker og datoer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div>
            <p className="mb-3 text-base font-medium text-foreground">Hvem booker?</p>
            <div className="grid grid-cols-3 gap-2">
              {PERSONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPerson(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl p-3 text-base font-medium transition-all",
                    p.soft,
                    person === p.id
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <span className={cn("h-4 w-4 rounded-full", p.color)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DateField label="Fra" date={start} onChange={setStart} />
            <DateField label="Til" date={end} onChange={setEnd} minDate={start} />
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
            onClick={() => {
              if (!person || !start || !end) return;
              mutation.mutate({
                person,
                start_date: toISODate(start),
                end_date: toISODate(end),
              });
            }}
          >
            Bekreft booking
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