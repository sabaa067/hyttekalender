import { CATEGORIES, CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";

export function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {CATEGORIES.map((c) => {
        const m = CATEGORY_META[c];
        return (
          <div
            key={c}
            className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-sm"
          >
            <span className={cn("h-3 w-3 rounded-full", m.dot)} />
            <span className="text-sm font-medium text-foreground sm:text-base">
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}