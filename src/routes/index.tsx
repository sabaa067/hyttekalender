import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, LayoutGrid, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { YearOverview } from "@/components/YearOverview";
import { PersonLegend } from "@/components/PersonLegend";
import { BookingDialog } from "@/components/BookingDialog";
import { EventDialog } from "@/components/EventDialog";
import { DayDetailDialog } from "@/components/DayDetailDialog";
import { fetchBookings } from "@/lib/bookings";
import { fetchEvents } from "@/lib/events";
import { FILTERS, type FilterKey } from "@/lib/filters";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type ViewMode = "modern" | "overview";

function Index() {
  const [view, setView] = useState<ViewMode>("modern");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [bookingOpen, setBookingOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [detailDate, setDetailDate] = useState<Date | null>(null);

  const { data: bookings = [], isLoading: bL } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });
  const { data: events = [], isLoading: eL } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const monthLabel = monthDate.toLocaleDateString("no-NO", {
    month: "long",
    year: "numeric",
  });

  const goPrev = () => {
    if (view === "modern") {
      setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
    } else {
      setYear(year - 1);
    }
  };
  const goNext = () => {
    if (view === "modern") {
      setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
    } else {
      setYear(year + 1);
    }
  };
  const goToday = () => {
    const now = new Date();
    setMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setYear(now.getFullYear());
  };

  const isEmpty = !bL && !eL && bookings.length === 0 && events.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-32 pt-6 sm:gap-6 sm:pt-10">
        <header className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Hyttekalender
          </h1>
          <PersonLegend />
        </header>

        {/* View toggle */}
        <div className="mx-auto flex rounded-full bg-card p-1 shadow-sm">
          <ToggleBtn
            active={view === "overview"}
            onClick={() => setView("overview")}
            icon={<LayoutGrid className="h-4 w-4" />}
            label="Oversikt"
          />
          <ToggleBtn
            active={view === "modern"}
            onClick={() => setView("modern")}
            icon={<CalendarDays className="h-4 w-4" />}
            label="Moderne"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all sm:text-base",
                filter === f.key
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2 rounded-3xl bg-card p-2 shadow-sm sm:p-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={goPrev}
            aria-label="Forrige"
            className="h-14 w-14 rounded-2xl"
          >
            <ChevronLeft className="!h-7 !w-7" />
          </Button>
          <button
            type="button"
            onClick={goToday}
            className="flex-1 rounded-2xl py-3 text-center text-xl font-semibold capitalize text-foreground transition-colors hover:bg-secondary sm:text-2xl"
          >
            {view === "modern" ? monthLabel : year}
          </button>
          <Button
            variant="ghost"
            size="lg"
            onClick={goNext}
            aria-label="Neste"
            className="h-14 w-14 rounded-2xl"
          >
            <ChevronRight className="!h-7 !w-7" />
          </Button>
        </div>

        {view === "modern" ? (
          <CalendarGrid
            monthDate={monthDate}
            bookings={bookings}
            events={events}
            filter={filter}
            onDayClick={(d) => setDetailDate(d)}
          />
        ) : (
          <YearOverview
            year={year}
            bookings={bookings}
            events={events}
            filter={filter}
            onDayClick={(d) => {
              setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
              setDetailDate(d);
            }}
          />
        )}

        {isEmpty && (
          <div className="rounded-3xl bg-card p-8 text-center shadow-sm">
            <p className="text-lg text-muted-foreground">
              Ingen bookinger eller hendelser ennå. Trykk på en dato for å starte.
            </p>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-16 flex-1 rounded-2xl text-base font-semibold"
            onClick={() => {
              setInitialDate(null);
              setEventOpen(true);
            }}
          >
            Ny hendelse
          </Button>
          <Button
            size="lg"
            className="h-16 flex-1 rounded-2xl text-lg font-semibold shadow-md"
            onClick={() => {
              setInitialDate(null);
              setBookingOpen(true);
            }}
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
      <EventDialog
        open={eventOpen}
        onOpenChange={setEventOpen}
        initialDate={initialDate}
      />
      <DayDetailDialog
        date={detailDate}
        bookings={bookings}
        events={events}
        onOpenChange={(o) => !o && setDetailDate(null)}
        onAddBooking={() => {
          setInitialDate(detailDate);
          setDetailDate(null);
          setBookingOpen(true);
        }}
        onAddEvent={() => {
          setInitialDate(detailDate);
          setDetailDate(null);
          setEventOpen(true);
        }}
      />
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-medium transition-all",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
