import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Cake } from "lucide-react";
import {
  type CalendarEntry,
  toISODate,
  entryCoversDate,
  entryMatchesFilters,
  entryMatchesCabinLocations,
  type FilterKey,
} from "@/lib/entries";
import { getEntryVisual, isBirthdayEntry, type CabinLocation } from "@/lib/categories";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

type Props = {
  year: number;
  entries: CalendarEntry[];
  filters: Set<FilterKey>;
  cabinLocations: Set<Exclude<CabinLocation, "all">>;
  onDayClick: (date: Date) => void;
};

export function ExcelView({ year, entries, filters, cabinLocations, onDayClick }: Props) {
  const visible = useMemo(
    () =>
      entries.filter(
        (e) => entryMatchesFilters(e, filters) && entryMatchesCabinLocations(e, cabinLocations),
      ),
    [entries, filters, cabinLocations],
  );

  const todayISO = toISODate(new Date());

  return (
    <div className="overflow-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th className="sticky left-0 z-20 w-12 border-b border-r border-border bg-card px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
              Dag
            </th>
            {MONTHS_SHORT.map((m, i) => (
              <th
                key={i}
                className="min-w-[110px] border-b border-r border-border bg-card px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 31 }, (_, dIdx) => {
            const day = dIdx + 1;
            return (
              <tr key={day} className="even:bg-secondary/30">
                <td className="sticky left-0 z-10 w-12 border-b border-r border-border bg-inherit px-2 py-1 text-center text-xs font-semibold text-muted-foreground">
                  {day}
                </td>
                {MONTHS_SHORT.map((_, mIdx) => {
                  const dim = new Date(year, mIdx + 1, 0).getDate();
                  if (day > dim) {
                    return (
                      <td
                        key={mIdx}
                        className="border-b border-r border-border bg-muted/40"
                      />
                    );
                  }
                  const date = new Date(year, mIdx, day);
                  const iso = toISODate(date);
                  const dayEntries = visible.filter((e) => entryCoversDate(e, iso));
                  const isToday = iso === todayISO;
                  const weekday = date.getDay(); // 0=Sun,6=Sat
                  const isWeekend = weekday === 0 || weekday === 6;
                  return (
                    <td
                      key={mIdx}
                      className={cn(
                        "min-w-[110px] cursor-pointer border-b border-r border-border align-top p-1 transition-colors hover:bg-accent/40",
                        isWeekend && "bg-secondary/40",
                        isToday && "ring-2 ring-foreground ring-inset",
                      )}
                      onClick={() => onDayClick(date)}
                    >
                      <div className="flex flex-col gap-0.5">
                        {dayEntries.map((e) => {
                          const v = getEntryVisual(e);
                          const isBday = isBirthdayEntry(e);
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
                              key={e.id}
                              className={cn(
                                "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium",
                                style,
                              )}
                              title={e.title}
                            >
                              {isBday && <Cake className="h-2.5 w-2.5 shrink-0" />}
                              <span className="truncate">{e.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
