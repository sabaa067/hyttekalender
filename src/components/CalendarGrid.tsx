import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { type Booking, toISODate, bookingCoversDate } from "@/lib/bookings";
import { personMeta } from "@/lib/persons";

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type Props = {
  monthDate: Date; // first day of displayed month
  bookings: Booking[];
  onDayClick: (date: Date) => void;
  onBookingClick: (booking: Booking) => void;
};

export function CalendarGrid({ monthDate, bookings, onDayClick, onBookingClick }: Props) {
  const cells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first offset
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const dayNum = i - offset + 1;
      const date = new Date(year, month, dayNum);
      return { date, inMonth: dayNum >= 1 && dayNum <= daysInMonth };
    });
  }, [monthDate]);

  const todayISO = toISODate(new Date());

  return (
    <div className="rounded-3xl bg-card p-3 shadow-sm sm:p-5">
      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map(({ date, inMonth }, idx) => {
          const iso = toISODate(date);
          const booking = bookings.find((b) => bookingCoversDate(b, iso));
          const isToday = iso === todayISO;
          const meta = booking ? personMeta(booking.person) : null;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (!inMonth) return;
                if (booking) onBookingClick(booking);
                else onDayClick(date);
              }}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-2xl text-lg font-medium transition-all sm:text-xl",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                inMonth ? "cursor-pointer hover:scale-[1.03]" : "cursor-default opacity-30",
                booking && meta ? meta.soft : "bg-secondary/40 text-foreground hover:bg-secondary",
                isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
              aria-label={
                booking
                  ? `${date.getDate()}. ${monthName(date)} – booket av ${personMeta(booking.person).label}`
                  : `${date.getDate()}. ${monthName(date)}`
              }
            >
              <span className={cn(isToday && "font-bold")}>{date.getDate()}</span>
              {booking && meta && (
                <span
                  className={cn(
                    "mt-1 h-1.5 w-6 rounded-full sm:h-2 sm:w-8",
                    meta.color,
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function monthName(d: Date) {
  return d.toLocaleDateString("no-NO", { month: "long" });
}