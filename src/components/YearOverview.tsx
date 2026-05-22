import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type CalendarEntry,
  toISODate,
  entryCoversDate,
  entryMatchesFilters,
  entryMatchesCabinLocations,
  type FilterKey,
} from "@/lib/entries";
import { getEntryVisual, type CabinLocation } from "@/lib/categories";

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];
const WEEKDAY_SHORT = ["M", "T", "O", "T", "F", "L", "S"];

type Props = {
  year: number;
  entries: CalendarEntry[];
  filters: Set<FilterKey>;
  cabinLocations: Set<Exclude<CabinLocation, "all">>;
  onDayClick: (date: Date) => void;
};

export function YearOverview({ year, entries, filters, cabinLocations, onDayClick }: Props) {
  const visible = entries.filter(
    (e) => entryMatchesFilters(e, filters) && entryMatchesCabinLocations(e, cabinLocations),
  );
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => (
        <MiniMonth
          key={m}
          year={year}
          month={m}
          entries={visible}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  );
}

function MiniMonth({
  year, month, entries, onDayClick,
}: { year: number; month: number; entries: CalendarEntry[]; onDayClick: (d: Date) => void }) {
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
          const dayEntries = entries.filter((e) => entryCoversDate(e, iso));
          const primary = dayEntries[0];
          const v = primary ? getEntryVisual(primary) : null;
          const isToday = iso === todayISO;

          return (
            <button
              key={idx}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onDayClick(date)}
              className={cn(
                "relative flex aspect-square overflow-hidden rounded-md text-xs transition-all",
                inMonth
                  ? "cursor-pointer hover:scale-110 hover:ring-2 hover:ring-primary/40 hover:shadow-md active:scale-95"
                  : "opacity-0 pointer-events-none",
                !v && "bg-secondary/40 text-foreground hover:bg-secondary",
                isToday && "ring-1 ring-foreground",
              )}
              title={
                dayEntries.length
                  ? dayEntries.map((e) => e.title).join(", ")
                  : "Legg til oppføring"
              }
            >
              {dayEntries.length > 0 && (
                <div className="absolute inset-0 flex flex-col">
                  {dayEntries.map((e) => {
                    const ev = getEntryVisual(e);
                    return (
                      <span
                        key={e.id}
                        className={cn("flex-1 w-full", ev.color)}
                      />
                    );
                  })}
                </div>
              )}
              <span
                className={cn(
                  "relative z-10 m-0.5 leading-none",
                  dayEntries.length > 0
                    ? "rounded bg-background/80 px-1 font-medium text-foreground"
                    : "",
                  isToday && "font-bold",
                )}
              >
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}