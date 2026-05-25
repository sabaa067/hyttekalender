import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Cake } from "lucide-react";
import {
  type CalendarEntry,
  toISODate,
  entryMatchesFilters,
  entryMatchesCabinLocations,
  type FilterKey,
} from "@/lib/entries";
import { getEntryVisual, isBirthdayEntry, type CabinLocation } from "@/lib/categories";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];
const MONTHS_LONG = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

type Props = {
  year: number;
  entries: CalendarEntry[];
  filters: Set<FilterKey>;
  cabinLocations: Set<Exclude<CabinLocation, "all">>;
  onDayClick: (date: Date) => void;
  onEntryClick?: (entry: CalendarEntry) => void;
};

export function ExcelView({ year, entries, filters, cabinLocations, onDayClick, onEntryClick }: Props) {
  const visible = useMemo(
    () =>
      entries.filter(
        (e) => entryMatchesFilters(e, filters) && entryMatchesCabinLocations(e, cabinLocations),
      ),
    [entries, filters, cabinLocations],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of visible) {
      const [sy, sm, sd] = e.start_date.split("-").map(Number);
      const [ey, em, ed] = e.end_date.split("-").map(Number);
      const cur = new Date(sy, sm - 1, sd);
      const last = new Date(ey, em - 1, ed);
      while (cur.getTime() <= last.getTime()) {
        const iso = toISODate(cur);
        const arr = map.get(iso);
        if (arr) arr.push(e);
        else map.set(iso, [e]);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [visible]);

  const todayISO = toISODate(new Date());
  const todayMonth = new Date().getMonth();
  const todayYear = new Date().getFullYear();

  return (
    <table
      className="border-collapse bg-card text-sm select-none"
      style={{ tableLayout: "fixed", width: "max-content" }}
    >
        <thead>
          <tr className="bg-foreground text-background">
            <th className="sticky left-0 z-20 w-14 border-b-2 border-r-2 border-foreground bg-foreground px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider">
              {year}
            </th>
            {MONTHS_LONG.map((m, i) => {
              const isCurrent = i === todayMonth && year === todayYear;
              return (
                <th
                  key={i}
                  className={cn(
                    "w-[120px] border-b-2 border-r-2 border-foreground/60 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider",
                    isCurrent ? "bg-primary text-primary-foreground" : "",
                  )}
                  title={m}
                >
                  <span className="sm:hidden">{MONTHS_SHORT[i]}</span>
                  <span className="hidden sm:inline">{m}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 31 }, (_, dIdx) => {
            const day = dIdx + 1;
            return (
              <tr key={day} className="odd:bg-card even:bg-secondary/40">
                <td className="sticky left-0 z-10 w-14 border-b border-r-2 border-border bg-inherit px-2 py-1 text-center text-xs font-bold text-foreground">
                  {day}
                </td>
                {MONTHS_SHORT.map((_, mIdx) => {
                  const dim = new Date(year, mIdx + 1, 0).getDate();
                  if (day > dim) {
                    return (
                      <td
                        key={mIdx}
                        className="w-[120px] border-b border-r-2 border-border/70 bg-muted/60"
                      />
                    );
                  }
                  const date = new Date(year, mIdx, day);
                  const iso = toISODate(date);
                  const dayEntries = byDate.get(iso) ?? [];
                  const isToday = iso === todayISO;
                  const weekday = date.getDay(); // 0=Sun,6=Sat
                  const isWeekend = weekday === 0 || weekday === 6;
                  return (
                    <td
                      key={mIdx}
                      className={cn(
                        "group w-[120px] cursor-pointer border-b border-r-2 border-border/70 align-top p-1 transition-all hover:bg-accent/40 hover:ring-1 hover:ring-inset hover:ring-primary/30 active:bg-accent/60",
                        isWeekend && "bg-secondary/60",
                        isToday && "ring-2 ring-primary ring-inset",
                      )}
                      onClick={() => onDayClick(date)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Legg til oppføring ${iso}`}
                    >
                      <div className="flex flex-col gap-0.5">
                        {dayEntries.map((e) => {
                          const v = getEntryVisual(e);
                          const isBday = isBirthdayEntry(e);
                          // Use solid fills to mirror the original colored
                          // cells of the cabin spreadsheet.
                          const style =
                            v.weight === "minimal"
                              ? "bg-card border border-border text-foreground"
                              : cn(v.color, "shadow-sm");
                          return (
                            <button
                              key={e.id}
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (onEntryClick) onEntryClick(e);
                                else onDayClick(date);
                              }}
                              className={cn(
                                "flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-left text-[10px] font-semibold leading-tight transition-transform hover:scale-[1.02] hover:shadow",
                                style,
                              )}
                              title={e.title}
                            >
                              {isBday && <Cake className="h-2.5 w-2.5 shrink-0" />}
                              <span className="truncate">{e.title}</span>
                            </button>
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
  );
}
