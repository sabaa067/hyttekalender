import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MonthJumper } from "@/components/MonthJumper";

type Mode = "modern" | "overview" | "excel";

type Props = {
  view: Mode;
  monthDate: Date;
  year: number;
  onPrev: () => void;
  onNext: () => void;
  onJumpMonth: (d: Date) => void;
  onJumpYear: (y: number) => void;
  onToday: () => void;
};

const MONTHS_NB = [
  "Januar","Februar","Mars","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Desember",
];

export function CalendarNav({
  view,
  monthDate,
  year,
  onPrev,
  onNext,
  onJumpMonth,
  onJumpYear,
  onToday,
}: Props) {
  const label =
    view === "modern"
      ? `${MONTHS_NB[monthDate.getMonth()]} ${monthDate.getFullYear()}`
      : String(year);

  return (
    <div className="flex items-center justify-between gap-2 rounded-3xl bg-card p-2 shadow-sm sm:p-3">
      <Button
        variant="ghost"
        size="lg"
        onClick={onPrev}
        aria-label="Forrige"
        className="h-14 w-14 rounded-2xl"
      >
        <ChevronLeft className="!h-7 !w-7" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex-1 rounded-2xl py-3 text-center text-xl font-semibold capitalize text-foreground transition-colors hover:bg-secondary sm:text-2xl"
          >
            {label}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-[min(92vw,22rem)] rounded-2xl border-border/60 bg-card/95 p-3 shadow-xl backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-foreground">
              {view === "modern" ? "Hopp til måned" : "Hopp til år"}
            </p>
            <button
              type="button"
              onClick={onToday}
              className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary/70"
            >
              I dag
            </button>
          </div>
          {view === "modern" ? (
            <MonthJumper monthDate={monthDate} onSelect={onJumpMonth} />
          ) : (
            <YearJumper year={year} onSelect={onJumpYear} />
          )}
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="lg"
        onClick={onNext}
        aria-label="Neste"
        className="h-14 w-14 rounded-2xl"
      >
        <ChevronRight className="!h-7 !w-7" />
      </Button>
    </div>
  );
}

function YearJumper({
  year,
  onSelect,
}: {
  year: number;
  onSelect: (y: number) => void;
}) {
  const years: number[] = [];
  for (let y = year - 4; y <= year + 6; y++) years.push(y);
  const currentYear = new Date().getFullYear();

  return (
    <div className="grid max-h-[60vh] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
      {years.map((y) => {
        const active = y === year;
        const isToday = y === currentYear;
        return (
          <button
            key={y}
            type="button"
            onClick={() => onSelect(y)}
            className={cn(
              "rounded-xl px-2 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-foreground text-background shadow-sm"
                : isToday
                ? "bg-secondary text-foreground ring-1 ring-foreground/20"
                : "bg-background text-foreground hover:bg-secondary",
            )}
          >
            {y}
          </button>
        );
      })}
    </div>
  );
}