import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AssistantBar } from "@/components/AssistantBar";
import type { CalendarEntry, FilterKey } from "@/lib/entries";
import type { CabinLocation } from "@/lib/categories";

type CabinLoc = Exclude<CabinLocation, "all">;

type Props = {
  entries: CalendarEntry[];
  onEditDraft: (draft: Partial<CalendarEntry>) => void;
  onOpenEvent: (entry: CalendarEntry) => void;
  context: {
    view: "modern" | "overview" | "excel";
    visibleMonth: Date;
    visibleYear: number;
    activeFilters: Set<FilterKey>;
    activeCabinLocations: Set<CabinLoc>;
    showHolidays: boolean;
  };
};

export function AssistantButton({
  entries,
  onEditDraft,
  onOpenEvent,
  context,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="AI-assistent"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-foreground transition-colors hover:bg-secondary"
        >
          <Sparkles className="h-[18px] w-[18px]" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="top-[calc(env(safe-area-inset-top,0px)_+_1rem)] max-h-[calc(100dvh_-_env(safe-area-inset-top,0px)_-_2rem)] translate-y-0 gap-0 overflow-y-auto rounded-3xl border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-xl sm:top-[8%] sm:max-h-[85vh] sm:translate-y-[-8%] sm:max-w-2xl sm:p-4"
      >
        <DialogTitle className="sr-only">AI-assistent</DialogTitle>
        <div className="mb-2 flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Spør kalenderen
        </div>
        <AssistantBar
          entries={entries}
          context={context}
          onEditDraft={(d) => {
            onEditDraft(d);
            setOpen(false);
          }}
          onOpenEvent={(e) => {
            onOpenEvent(e);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}