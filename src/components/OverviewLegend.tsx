import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_META, CABIN_LOCATION_META } from "@/lib/categories";

export function OverviewLegend() {
  const [open, setOpen] = useState(true);

  const items: { label: string; color: string }[] = [
    { label: `Hytte · ${CABIN_LOCATION_META.paradis.label}`, color: "bg-cabin-paradis" },
    { label: `Hytte · ${CABIN_LOCATION_META.fjord.label}`, color: "bg-cabin-fjord" },
    { label: "Arrangement", color: CATEGORY_META.event.dot },
    { label: "Høydepunkt", color: CATEGORY_META.highlight.dot },
    { label: "Notat", color: CATEGORY_META.note.dot },
    { label: "Høytid", color: CATEGORY_META.holiday.dot },
  ];

  return (
    <div
      className={cn(
        "fixed bottom-24 right-4 z-20 w-[80vw] max-w-[260px] rounded-2xl border border-border/60 bg-card/80 p-3 shadow-lg backdrop-blur-md sm:w-[25vw]",
        "transition-all",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <Info className="h-4 w-4 text-muted-foreground" />
          Fargeguide
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>
      {open && (
        <ul className="mt-2 grid grid-cols-1 gap-1.5">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-3 w-3 shrink-0 rounded-sm", it.color)} />
              <span className="truncate">{it.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}