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
          className="fixed right-16 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary sm:right-[4.5rem] sm:top-4"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent
        className="top-[8%] max-h-[85vh] translate-y-[-8%] gap-0 overflow-y-auto rounded-3xl border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-xl sm:max-w-2xl sm:p-4"
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