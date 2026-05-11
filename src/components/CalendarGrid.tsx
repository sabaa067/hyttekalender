import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type CalendarEntry,
  toISODate,
  entryCoversDate,
  entryMatchesFilter,
  type FilterKey,
} from "@/lib/entries";
import { CATEGORY_META } from "@/lib/categories";

const WEEKDAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

type Props = {
  monthDate: Date;
  entries: CalendarEntry[];
  filter: FilterKey;
  onDayClick: (date: Date) => void;
};

export function CalendarGrid({ monthDate, entries, filter, onDayClick }: Props) {
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
  const visible = entries.filter((e) => entryMatchesFilter(e, filter));

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
          const primary = dayEntries[0];
          const meta = primary ? CATEGORY_META[primary.category] : null;
          const isToday = iso === todayISO;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => inMonth && onDayClick(date)}
              className={cn(
                "relative flex min-h-[88px] flex-col items-stretch rounded-2xl p-1.5 text-left transition-all sm:min-h-[120px] sm:p-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                inMonth ? "cursor-pointer hover:scale-[1.02]" : "cursor-default opacity-30",
                meta ? meta.soft : "bg-secondary/40 text-foreground hover:bg-secondary",
                isToday && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
            >
              <span
                className={cn(
                  "text-base font-semibold sm:text-lg",
                  isToday && "font-bold",
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
  // Show as many entries as fit; overflow indicator for the rest.
  // We use a responsive cap: tighter on mobile, more on larger cells.
  const MOBILE_MAX = 3;
  const DESKTOP_MAX = 5;
  const visibleMobile = entries.slice(0, MOBILE_MAX);
  const visibleDesktop = entries.slice(0, DESKTOP_MAX);
  const overflowMobile = entries.length - MOBILE_MAX;
  const overflowDesktop = entries.length - DESKTOP_MAX;

  return (
    <div className="mt-auto flex flex-col gap-0.5">
      {/* Mobile list */}
      <div className="flex flex-col gap-0.5 sm:hidden">
        {visibleMobile.map((e) => (
          <EntryChip key={e.id} entry={e} />
        ))}
        {overflowMobile > 0 && (
          <span className="px-1 text-[10px] font-semibold text-muted-foreground">
            +{overflowMobile} til
          </span>
        )}
      </div>
      {/* Desktop list */}
      <div className="hidden flex-col gap-0.5 sm:flex">
        {visibleDesktop.map((e) => (
          <EntryChip key={e.id} entry={e} />
        ))}
        {overflowDesktop > 0 && (
          <span className="px-1 text-xs font-semibold text-muted-foreground">
            +{overflowDesktop} til
          </span>
        )}
      </div>
    </div>
  );
}

function EntryChip({ entry }: { entry: CalendarEntry }) {
  const m = CATEGORY_META[entry.category];
  return (
    <div
      className={cn(
        "truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:text-xs",
        m.color,
      )}
      title={entry.title}
    >
      {entry.title}
    </div>
  );
}