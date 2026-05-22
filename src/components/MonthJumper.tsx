import { cn } from "@/lib/utils";

const MONTHS_NB = [
  "Januar","Februar","Mars","April","Mai","Juni",
  "Juli","August","September","Oktober","November","Desember",
];

export function MonthJumper({
  monthDate,
  onSelect,
}: {
  monthDate: Date;
  onSelect: (d: Date) => void;
}) {
  const baseYear = monthDate.getFullYear();
  const years = [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];
  const today = new Date();

  return (
    <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
      {years.map((y) => (
        <div key={y}>
          <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {y}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS_NB.map((m, i) => {
              const active =
                y === monthDate.getFullYear() && i === monthDate.getMonth();
              const isToday =
                y === today.getFullYear() && i === today.getMonth();
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelect(new Date(y, i, 1))}
                  className={cn(
                    "rounded-xl px-2 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-foreground text-background shadow-sm"
                      : isToday
                      ? "bg-secondary text-foreground ring-1 ring-foreground/20"
                      : "bg-background text-foreground hover:bg-secondary",
                  )}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}