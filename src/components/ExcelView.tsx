import { useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Cake } from "lucide-react";
import { type CalendarEntry, toISODate, type FilterKey } from "@/lib/entries";
import {
  CATEGORY_META,
  CABIN_LOCATION_META,
  isBirthdayEntry,
  primaryCabinLocation,
  type CabinLocation,
} from "@/lib/categories";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];
const WEEKDAYS_SHORT = ["S", "M", "T", "O", "T", "F", "L"]; // JS getDay: 0=Sun..6=Sat

type Props = {
  year: number;
  entries: CalendarEntry[];
  filters: Set<FilterKey>;
  cabinLocations: Set<Exclude<CabinLocation, "all">>;
  onDayClick: (date: Date) => void;
  onEntryClick?: (entry: CalendarEntry) => void;
};

type RowKey = FilterKey;

const ROW_DEFS: { key: RowKey; label: string; color: string; soft: string }[] = [
  {
    key: "paradis",
    label: "Paradis",
    color: CABIN_LOCATION_META.paradis.color,
    soft: CABIN_LOCATION_META.paradis.soft,
  },
  {
    key: "fjord",
    label: "Fjordgløtt",
    color: CABIN_LOCATION_META.fjord.color,
    soft: CABIN_LOCATION_META.fjord.soft,
  },
  {
    key: "event",
    label: "Arrangementer",
    color: CATEGORY_META.event.color,
    soft: CATEGORY_META.event.soft,
  },
  {
    key: "highlight",
    label: "Høydepunkter",
    color: CATEGORY_META.highlight.color,
    soft: CATEGORY_META.highlight.soft,
  },
  {
    key: "note",
    label: "Notater",
    color: CATEGORY_META.note.color,
    soft: CATEGORY_META.note.soft,
  },
  {
    key: "holiday",
    label: "Høytider",
    color: CATEGORY_META.holiday.color,
    soft: CATEGORY_META.holiday.soft,
  },
];

function entryInRow(e: CalendarEntry, key: RowKey): boolean {
  if (key === "paradis" || key === "fjord") {
    if (e.category !== "cabin") return false;
    const loc = primaryCabinLocation(`${e.title} ${e.description ?? ""}`);
    if (loc === null) return true;
    return loc === key;
  }
  if (key === "highlight") return e.category === "highlight" || e.category === "birthday";
  if (key === "holiday") return e.category === "holiday";
  return e.category === key;
}

type Interval = { entry: CalendarEntry; start: number; end: number };

function dayIndex(year: number, iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(year, 0, 1).getTime();
  const t = new Date(y, m - 1, d).getTime();
  return Math.round((t - start) / 86400000);
}

function assignLanes(intervals: Interval[]): Interval[][] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const lanes: Interval[][] = [];
  for (const iv of sorted) {
    let placed = false;
    for (const lane of lanes) {
      if (lane[lane.length - 1].end < iv.start) {
        lane.push(iv);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([iv]);
  }
  return lanes;
}

const COL_W = 26; // px per day
const LABEL_W = 124; // px for sticky row-label column

export function ExcelView({ year, entries, filters, onDayClick, onEntryClick }: Props) {
  const daysInYear = useMemo(() => {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 366 : 365;
  }, [year]);

  const days = useMemo(() => {
    const out: { date: Date; iso: string; day: number; month: number; weekday: number }[] = [];
    for (let i = 0; i < daysInYear; i++) {
      const d = new Date(year, 0, 1 + i);
      out.push({
        date: d,
        iso: toISODate(d),
        day: d.getDate(),
        month: d.getMonth(),
        weekday: d.getDay(),
      });
    }
    return out;
  }, [year, daysInYear]);

  const monthSpans = useMemo(() => {
    const spans: { month: number; span: number }[] = [];
    for (let m = 0; m < 12; m++) {
      spans.push({ month: m, span: new Date(year, m + 1, 0).getDate() });
    }
    return spans;
  }, [year]);

  const todayISO = toISODate(new Date());
  const todayIdx = useMemo(() => {
    const n = new Date();
    if (n.getFullYear() !== year) return -1;
    return dayIndex(year, todayISO);
  }, [year, todayISO]);

  const rows = useMemo(() => {
    return ROW_DEFS.filter((r) => filters.has(r.key)).map((def) => {
      const ivs: Interval[] = [];
      for (const e of entries) {
        if (!entryInRow(e, def.key)) continue;
        const s = dayIndex(year, e.start_date);
        const en = dayIndex(year, e.end_date);
        const start = Math.max(0, s);
        const end = Math.min(daysInYear - 1, en);
        if (end < 0 || start > daysInYear - 1 || start > end) continue;
        ivs.push({ entry: e, start, end });
      }
      const lanes = assignLanes(ivs);
      return { def, lanes: lanes.length ? lanes : [[]] };
    });
  }, [entries, filters, year, daysInYear]);

  const totalWidth = LABEL_W + daysInYear * COL_W;

  return (
    <div
      className="relative overflow-auto rounded-2xl border border-border bg-card shadow-sm"
      style={{ maxHeight: "78vh" }}
    >
      <table
        className="border-collapse bg-card text-xs select-none"
        style={{ tableLayout: "fixed", width: totalWidth }}
      >
        <colgroup>
          <col style={{ width: LABEL_W }} />
          {days.map((_, i) => (
            <col key={i} style={{ width: COL_W }} />
          ))}
        </colgroup>
        <thead>
          {/* Months row */}
          <tr>
            <th
              rowSpan={3}
              className="sticky left-0 top-0 z-30 border-b border-r-2 border-foreground bg-foreground px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-background"
              style={{ width: LABEL_W }}
            >
              {year}
            </th>
            {monthSpans.map(({ month, span }) => (
              <th
                key={month}
                colSpan={span}
                className="sticky top-0 z-20 border-b border-r-2 border-foreground/70 bg-foreground px-1 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-background"
              >
                {MONTHS_SHORT[month]}
              </th>
            ))}
          </tr>
          {/* Day numbers row */}
          <tr>
            {days.map((d, i) => {
              const isWeekend = d.weekday === 0 || d.weekday === 6;
              const isToday = i === todayIdx;
              const monthEnd = i + 1 === daysInYear || days[i + 1].month !== d.month;
              return (
                <th
                  key={i}
                  className={cn(
                    "sticky z-10 border-b border-border/70 bg-secondary/80 px-0 py-0.5 text-center text-[10px] font-semibold text-foreground",
                    monthEnd ? "border-r-2 border-r-foreground/40" : "border-r border-r-border/40",
                    isWeekend && "bg-secondary",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                  style={{ top: 24 }}
                >
                  {d.day}
                </th>
              );
            })}
          </tr>
          {/* Weekday row */}
          <tr>
            {days.map((d, i) => {
              const isWeekend = d.weekday === 0 || d.weekday === 6;
              const isToday = i === todayIdx;
              const monthEnd = i + 1 === daysInYear || days[i + 1].month !== d.month;
              return (
                <th
                  key={i}
                  className={cn(
                    "sticky z-10 border-b-2 border-foreground/40 bg-secondary/60 px-0 py-0.5 text-center text-[9px] font-medium uppercase text-muted-foreground",
                    monthEnd ? "border-r-2 border-r-foreground/40" : "border-r border-r-border/40",
                    isWeekend && "bg-secondary text-foreground",
                    isToday && "bg-primary/80 text-primary-foreground",
                  )}
                  style={{ top: 46 }}
                >
                  {WEEKDAYS_SHORT[d.weekday]}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ def, lanes }) => (
            <RowGroup
              key={def.key}
              def={def}
              lanes={lanes}
              days={days}
              daysInYear={daysInYear}
              todayIdx={todayIdx}
              onDayClick={onDayClick}
              onEntryClick={onEntryClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowGroup({
  def,
  lanes,
  days,
  daysInYear,
  todayIdx,
  onDayClick,
  onEntryClick,
}: {
  def: { key: RowKey; label: string; color: string; soft: string };
  lanes: Interval[][];
  days: { date: Date; weekday: number; month: number }[];
  daysInYear: number;
  todayIdx: number;
  onDayClick: (d: Date) => void;
  onEntryClick?: (e: CalendarEntry) => void;
}) {
  return (
    <>
      {lanes.map((lane, laneIdx) => {
        const cells: ReactNode[] = [];
        const sorted = [...lane].sort((a, b) => a.start - b.start);
        let i = 0;
        let cursor = 0;
        while (i < daysInYear) {
          const iv = sorted[cursor];
          if (iv && iv.start === i) {
            const span = iv.end - iv.start + 1;
            const isBday = isBirthdayEntry(iv.entry);
            cells.push(
              <td
                key={`iv-${iv.entry.id}-${i}`}
                colSpan={span}
                className="border-b border-r border-border/30 p-0.5 align-middle"
              >
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (onEntryClick) onEntryClick(iv.entry);
                    else onDayClick(days[i].date);
                  }}
                  title={iv.entry.title}
                  className={cn(
                    "flex h-5 w-full items-center gap-1 truncate rounded-sm px-1 text-left text-[10px] font-semibold leading-none shadow-sm transition-transform hover:scale-[1.01]",
                    def.color,
                  )}
                >
                  {isBday && <Cake className="h-2.5 w-2.5 shrink-0" />}
                  <span className="truncate">{iv.entry.title}</span>
                </button>
              </td>,
            );
            i += span;
            cursor++;
          } else {
            const d = days[i];
            const isWeekend = d.weekday === 0 || d.weekday === 6;
            const isToday = i === todayIdx;
            const monthEnd = i + 1 === daysInYear || days[i + 1].month !== d.month;
            cells.push(
              <td
                key={`e-${i}`}
                onClick={() => onDayClick(d.date)}
                className={cn(
                  "cursor-pointer border-b border-border/30 align-middle p-0 hover:bg-accent/40",
                  monthEnd ? "border-r-2 border-r-foreground/30" : "border-r border-r-border/30",
                  isWeekend && "bg-secondary/60",
                  isToday && "bg-primary/10 ring-1 ring-inset ring-primary/60",
                )}
                style={{ height: 24 }}
                aria-label={`Legg til oppføring ${toISODate(d.date)}`}
              />,
            );
            i++;
          }
        }
        return (
          <tr key={`${def.key}-${laneIdx}`} className="odd:bg-card even:bg-secondary/20">
            {laneIdx === 0 && (
              <th
                scope="row"
                rowSpan={lanes.length}
                className={cn(
                  "sticky left-0 z-10 border-b border-r-2 border-foreground/40 px-2 py-1 text-left align-middle text-[11px] font-semibold uppercase tracking-wide",
                  def.soft,
                )}
                style={{ width: LABEL_W }}
              >
                {def.label}
              </th>
            )}
            {cells}
          </tr>
        );
      })}
    </>
  );
}
