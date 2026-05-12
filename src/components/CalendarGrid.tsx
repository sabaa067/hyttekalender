import { useMemo } from "react";
import { Cake } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CalendarEntry,
  toISODate,
  entryCoversDate,
  entryMatchesFilters,
  entryMatchesCabinLocations,
  type FilterKey,
} from "@/lib/entries";
import { getEntryVisual, isBirthdayEntry, type CabinLocation } from "@/lib/categories";

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type Props = {
  monthDate: Date;
  entries: CalendarEntry[];
  filters: Set<FilterKey>;
  cabinLocations: Set<Exclude<CabinLocation, "all">>;
  onDayClick: (date: Date) => void;
};

export function CalendarGrid({ monthDate, entries, filters, cabinLocations, onDayClick }: Props) {
  const cells = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
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
  const visible = entries.filter(
    (e) => entryMatchesFilters(e, filters) && entryMatchesCabinLocations(e, cabinLocations),
  );

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
          const dayEntries = visible.filter((e) => entryCoversDate(e, iso));
          const isToday = iso === todayISO;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => inMonth && onDayClick(date)}
              className={cn(
                "relative flex min-h-[100px] flex-col items-stretch rounded-2xl p-1.5 text-left transition-all sm:min-h-[140px] sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                inMonth ? "cursor-pointer hover:scale-[1.02]" : "cursor-default opacity-30",
                "bg-secondary/30 text-foreground hover:bg-secondary/60",
                isToday &&
                  "bg-primary/10 ring-2 ring-primary/60 ring-offset-2 ring-offset-card shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
              )}
            >
              <span
                className={cn(
                  "text-base font-semibold sm:text-lg",
                  isToday &&
                    "inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-sm",
                )}
              >
                {date.getDate()}
              </span>
              <DayEntries entries={dayEntries} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayEntries({ entries }: { entries: CalendarEntry[] }) {
  // Modern mode: prioritize readability — show ALL events with full titles.
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      {entries.map((e) => (
        <EntryChip key={e.id} entry={e} />
      ))}
    </div>
  );
}

function EntryChip({ entry }: { entry: CalendarEntry }) {
  const v = getEntryVisual(entry);
  const isBday = isBirthdayEntry(entry);
  const style =
    v.weight === "strong"
      ? cn(v.color, "shadow-sm")
      : v.weight === "warm"
      ? v.soft
      : v.weight === "medium"
      ? v.soft
      : "bg-card border border-border text-muted-foreground";
  return (
    <div
      className={cn(
        "flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-all sm:text-xs",
        style,
      )}
      title={entry.title}
    >
      {isBday && <Cake className="h-3 w-3 shrink-0" />}
      <span className="truncate">{entry.title}</span>
    </div>
  );
}