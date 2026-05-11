import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { type Booking, toISODate, bookingCoversDate } from "@/lib/bookings";
import { personMeta } from "@/lib/persons";
import { type CalendarEvent, eventCoversDate } from "@/lib/events";
import { type FilterKey, showBookings, showEventType } from "@/lib/filters";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];
const WEEKDAY_SHORT = ["M", "T", "O", "T", "F", "L", "S"];

type Props = {
  year: number;
  bookings: Booking[];
  events: CalendarEvent[];
  filter: FilterKey;
  onDayClick: (date: Date) => void;
};

export function YearOverview({ year, bookings, events, filter, onDayClick }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth
          key={m}
          year={year}
          month={m}
          bookings={bookings}
          events={events}
          filter={filter}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  );
}

function MiniMonth({
  year, month, bookings, events, filter, onDayClick,
}: { year: number; month: number } & Omit<Props, "year">) {
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i - offset + 1;
      const date = new Date(year, month, dayNum);
      return { date, inMonth: dayNum >= 1 && dayNum <= daysInMonth };
    });
  }, [year, month]);

  const todayISO = toISODate(new Date());
  const bookingsVisible = showBookings(filter);

  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      <h3 className="mb-2 text-center text-base font-semibold text-foreground">
        {MONTH_NAMES[month]}
      </h3>
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAY_SHORT.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium uppercase text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }, idx) => {
          const iso = toISODate(date);
          const booking = bookingsVisible
            ? bookings.find((b) => bookingCoversDate(b, iso))
            : undefined;
          const dayEvents = events.filter(
            (e) => showEventType(filter, e.type) && eventCoversDate(e, iso),
          );
          const hasEvent = dayEvents.length > 0;
          const isToday = iso === todayISO;
          const meta = booking ? personMeta(booking.person) : null;

          return (
            <button
              key={idx}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onDayClick(date)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-md text-xs transition-all",
                inMonth ? "cursor-pointer hover:scale-110" : "opacity-0 pointer-events-none",
                booking && meta ? meta.soft : "text-foreground hover:bg-secondary",
                isToday && "ring-1 ring-foreground",
              )}
            >
              <span className={cn(isToday && "font-bold")}>{date.getDate()}</span>
              {hasEvent && (
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-event-event" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}