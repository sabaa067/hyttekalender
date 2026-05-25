import { useMemo } from "react";
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
  "jan", "feb", "mar", "apr", "mai", "jun",
  "jul", "aug", "sep", "okt", "nov", "des",
];
const WEEKDAYS_SHORT = ["sø", "ma", "ti", "on", "to", "fr", "lø"];

type Props = {
  year: number;
  entries: CalendarEntry[];
  filters: Set<FilterKey>;
  cabinLocations: Set<Exclude<CabinLocation, "all">>;
  onDayClick: (date: Date) => void;
  onEntryClick?: (entry: CalendarEntry) => void;
};

type ColKey = FilterKey;

const COL_DEFS: { key: ColKey; label: string; color: string; soft: string }[] = [
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

function entryInCol(e: CalendarEntry, key: ColKey): boolean {
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

const DATE_COL_W = 96;
const CAT_COL_W = 120;
const ROW_H = 30;

export function ExcelView({ year: _year, entries, filters, onDayClick, onEntryClick }: Props) {
  // Always start from today; show through end of (current year + 2)
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endYear = today.getFullYear() + 2;
    const end = new Date(endYear, 11, 31);
    const out: { date: Date; iso: string; weekday: number; month: number; isMonthStart: boolean }[] = [];
    const cursor = new Date(today);
    let prevMonth = -1;
    while (cursor <= end) {
      const m = cursor.getMonth();
      out.push({
        date: new Date(cursor),
        iso: toISODate(cursor),
        weekday: cursor.getDay(),
        month: m,
        isMonthStart: m !== prevMonth,
      });
      prevMonth = m;
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, []);

  const cols = useMemo(() => COL_DEFS.filter((c) => filters.has(c.key)), [filters]);

  // Map iso -> per-column entries
  const cellMap = useMemo(() => {
    const map = new Map<string, Map<ColKey, CalendarEntry[]>>();
    for (const d of days) map.set(d.iso, new Map());
    for (const e of entries) {
      const start = e.start_date < days[0].iso ? days[0].iso : e.start_date;
      const end = e.end_date;
      if (end < days[0].iso) continue;
      if (start > days[days.length - 1].iso) continue;
      for (const col of cols) {
        if (!entryInCol(e, col.key)) continue;
        // iterate covered days
        const s = new Date(start);
        const en = new Date(end);
        const last = days[days.length - 1].date;
        const cap = en > last ? last : en;
        const cur = new Date(s);
        while (cur <= cap) {
          const iso = toISODate(cur);
          const row = map.get(iso);
          if (row) {
            const arr = row.get(col.key) ?? [];
            arr.push(e);
            row.set(col.key, arr);
          }
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return map;
  }, [entries, cols, days]);

  const todayISO = toISODate(new Date());
  const totalWidth = DATE_COL_W + cols.length * CAT_COL_W;

  return (
    <div
      className="relative overflow-auto rounded-xl border border-border bg-card shadow-sm overscroll-contain"
      style={{ maxHeight: "78vh", WebkitOverflowScrolling: "touch" }}
    >
      <table
        className="border-collapse bg-card text-xs select-none"
        style={{ tableLayout: "fixed", width: totalWidth }}
      >
        <colgroup>
          <col style={{ width: DATE_COL_W }} />
          {cols.map((c) => (
            <col key={c.key} style={{ width: CAT_COL_W }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              className="sticky left-0 top-0 z-30 border-b-2 border-r-2 border-border bg-foreground px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-background"
              style={{ width: DATE_COL_W }}
            >
              Dato
            </th>
            {cols.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "sticky top-0 z-20 border-b-2 border-r border-border bg-foreground/95 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-background backdrop-blur",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d, idx) => {
            const isWeekend = d.weekday === 0 || d.weekday === 6;
            const isToday = d.iso === todayISO;
            const dateLabel = `${d.date.getDate()} ${MONTHS_SHORT[d.month]}`;
            return (
              <tr
                key={d.iso}
                className={cn(
                  idx % 2 === 0 ? "bg-card" : "bg-secondary/30",
                  d.isMonthStart && "border-t-2 border-t-foreground/40",
                )}
              >
                <th
                  scope="row"
                  onClick={() => onDayClick(d.date)}
                  className={cn(
                    "sticky left-0 z-10 cursor-pointer border-b border-r-2 border-border/70 px-2 text-left align-middle text-[11px] font-semibold",
                    idx % 2 === 0 ? "bg-card" : "bg-secondary/60",
                    isWeekend && "text-foreground",
                    isToday && "bg-primary text-primary-foreground",
                  )}
                  style={{ width: DATE_COL_W, height: ROW_H }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>{dateLabel}</span>
                    <span className="text-[9px] uppercase opacity-60">{WEEKDAYS_SHORT[d.weekday]}</span>
                  </div>
                </th>
                {cols.map((c) => {
                  const list = cellMap.get(d.iso)?.get(c.key) ?? [];
                  const primary = list[0];
                  return (
                    <td
                      key={c.key}
                      onClick={() => {
                        if (primary && onEntryClick) onEntryClick(primary);
                        else onDayClick(d.date);
                      }}
                      className={cn(
                        "cursor-pointer border-b border-r border-border/40 p-0.5 align-middle",
                        isWeekend && "bg-secondary/40",
                        isToday && "ring-1 ring-inset ring-primary/50",
                      )}
                      style={{ height: ROW_H }}
                    >
                      {primary ? (
                        <div
                          className={cn(
                            "flex h-full w-full items-center gap-1 truncate rounded-sm px-1 text-[10px] font-semibold leading-tight",
                            c.color,
                          )}
                          title={list.map((e) => e.title).join(", ")}
                        >
                          {isBirthdayEntry(primary) && <Cake className="h-2.5 w-2.5 shrink-0" />}
                          <span className="truncate">{primary.title}</span>
                          {list.length > 1 && (
                            <span className="ml-auto rounded-full bg-background/30 px-1 text-[9px]">
                              +{list.length - 1}
                            </span>
                          )}
                        </div>
                      ) : null}
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
