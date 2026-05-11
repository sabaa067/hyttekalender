import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { PersonLegend } from "@/components/PersonLegend";
import { BookingDialog } from "@/components/BookingDialog";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import { fetchBookings, type Booking } from "@/lib/bookings";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [bookingOpen, setBookingOpen] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });

  const monthLabel = monthDate.toLocaleDateString("no-NO", {
    month: "long",
    year: "numeric",
  });

  const goPrev = () =>
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
  const goNext = () =>
    setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const openNewBooking = (d: Date | null) => {
    setInitialDate(d);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pb-32 pt-6 sm:gap-7 sm:pt-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Hyttekalender
          </h1>
          <PersonLegend />
        </header>

        <div className="flex items-center justify-between gap-2 rounded-3xl bg-card p-2 shadow-sm sm:p-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={goPrev}
            aria-label="Forrige måned"
            className="h-14 w-14 rounded-2xl"
          >
            <ChevronLeft className="!h-7 !w-7" />
          </Button>
          <button
            type="button"
            onClick={goToday}
            className="flex-1 rounded-2xl py-3 text-center text-xl font-semibold capitalize text-foreground transition-colors hover:bg-secondary sm:text-2xl"
          >
            {monthLabel}
          </button>
          <Button
            variant="ghost"
            size="lg"
            onClick={goNext}
            aria-label="Neste måned"
            className="h-14 w-14 rounded-2xl"
          >
            <ChevronRight className="!h-7 !w-7" />
          </Button>
        </div>

        <CalendarGrid
          monthDate={monthDate}
          bookings={bookings}
          onDayClick={(d) => openNewBooking(d)}
          onBookingClick={(b) => setSelectedBooking(b)}
        />

        {!isLoading && bookings.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center shadow-sm">
            <p className="text-lg text-muted-foreground">
              Ingen bookinger ennå. Trykk på en dato for å starte.
            </p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 p-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Button
            size="lg"
            className="h-16 w-full rounded-2xl text-lg font-semibold shadow-md"
            onClick={() => openNewBooking(null)}
          >
            <Plus className="!h-6 !w-6" />
            Ny booking
          </Button>
        </div>
      </div>

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        initialDate={initialDate}
      />
      <BookingDetailsDialog
        booking={selectedBooking}
        onOpenChange={(o) => !o && setSelectedBooking(null)}
      />
    </div>
  );
}
