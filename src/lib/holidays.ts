import type { CalendarEntry } from "./entries";

// Anonymous Gregorian Easter algorithm (returns Date for Easter Sunday).
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function generateNorwegianHolidays(year: number): CalendarEntry[] {
  const easter = easterSunday(year);
  const items: { title: string; date: Date }[] = [
    { title: "Nyttårsdag", date: new Date(year, 0, 1) },
    { title: "Skjærtorsdag", date: addDays(easter, -3) },
    { title: "Langfredag", date: addDays(easter, -2) },
    { title: "1. påskedag", date: easter },
    { title: "2. påskedag", date: addDays(easter, 1) },
    { title: "Arbeidernes dag", date: new Date(year, 4, 1) },
    { title: "Grunnlovsdag (17. mai)", date: new Date(year, 4, 17) },
    { title: "Kristi himmelfartsdag", date: addDays(easter, 39) },
    { title: "1. pinsedag", date: addDays(easter, 49) },
    { title: "2. pinsedag", date: addDays(easter, 50) },
    { title: "Julaften", date: new Date(year, 11, 24) },
    { title: "1. juledag", date: new Date(year, 11, 25) },
    { title: "2. juledag", date: new Date(year, 11, 26) },
    { title: "Nyttårsaften", date: new Date(year, 11, 31) },
  ];
  const now = new Date().toISOString();
  return items.map((it) => {
    const d = iso(it.date);
    return {
      id: `holiday-${year}-${it.title}`,
      title: it.title,
      category: "holiday",
      start_date: d,
      end_date: d,
      description: null,
      created_by: null,
      created_at: now,
      updated_at: now,
    } satisfies CalendarEntry;
  });
}

export function generateHolidaysForYears(years: number[]): CalendarEntry[] {
  const set = new Set(years);
  return Array.from(set).flatMap((y) => generateNorwegianHolidays(y));
}