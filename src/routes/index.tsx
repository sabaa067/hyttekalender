import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LayoutGrid, CalendarDays, Table2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CalendarGrid } from "@/components/CalendarGrid";
import { YearOverview } from "@/components/YearOverview";
import { ExcelView } from "@/components/ExcelView";
import { EntryDialog } from "@/components/EntryDialog";
import { DayDetailPanel } from "@/components/DayDetailPanel";
import { AssistantButton } from "@/components/AssistantButton";
import { CalendarNav } from "@/components/CalendarNav";
import { OverviewLegend } from "@/components/OverviewLegend";
import { AppMenu } from "@/components/AppMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { LoginGate } from "@/components/LoginGate";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProfileChip } from "@/components/ProfileChip";
import { useAuth } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchEntries,
  FILTERS,
  type FilterKey,
  type CalendarEntry,
} from "@/lib/entries";
import { CABIN_LOCATION_META, CATEGORY_META, type CabinLocation } from "@/lib/categories";

const FILTER_META: Record<
  Exclude<import("@/lib/entries").FilterKey, "holiday">,
  { color: string; soft: string }
> = {
  paradis: { color: CABIN_LOCATION_META.paradis.color, soft: CABIN_LOCATION_META.paradis.soft },
  fjord: { color: CABIN_LOCATION_META.fjord.color, soft: CABIN_LOCATION_META.fjord.soft },
  event: { color: CATEGORY_META.event.color, soft: CATEGORY_META.event.soft },
  highlight: { color: CATEGORY_META.highlight.color, soft: CATEGORY_META.highlight.soft },
  note: { color: CATEGORY_META.note.color, soft: CATEGORY_META.note.soft },
};
import { generateHolidaysForYears } from "@/lib/holidays";

type CabinLoc = Exclude<CabinLocation, "all">;
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

type ViewMode = "modern" | "overview" | "excel";

function Index() {
  const { user, loading: authLoading } = useAuth();
  const canEdit = user?.role === "admin";
  const [view, setView] = useState<ViewMode>("modern");
  const setViewMode = (next: ViewMode) => {
    if (next === "modern") {
      const n = new Date();
      setMonthDate(new Date(n.getFullYear(), n.getMonth(), 1));
    }
    setView(next);
  };
  const ALL_MAIN_FILTERS: FilterKey[] = ["paradis", "fjord", "event", "highlight", "note"];
  const [filters, setFilters] = useState<Set<FilterKey>>(
    () => new Set(ALL_MAIN_FILTERS),
  );
  const [cabinLocations] = useState<Set<CabinLoc>>(() => new Set());
  // Høytider is OFF by default and is NOT toggled by "Alt".
  const [showHolidays, setShowHolidays] = useState(false);

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const allActive =
    ALL_MAIN_FILTERS.every((k) => filters.has(k)) && showHolidays;
  const toggleAll = () => {
    if (allActive) {
      setFilters(new Set());
      setShowHolidays(false);
    } else {
      setFilters(new Set(ALL_MAIN_FILTERS));
      setShowHolidays(true);
    }
  };
  const [monthDate, setMonthDate] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entryOpen, setEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [initialDate, setInitialDate] = useState<Date | null>(null);
  const [draftEntry, setDraftEntry] = useState<Partial<CalendarEntry> | null>(null);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["entries"],
    queryFn: fetchEntries,
    enabled: !!user,
  });

  const holidayEntries = useMemo(() => {
    if (!showHolidays) return [] as CalendarEntry[];
    const baseYear = view === "modern" ? monthDate.getFullYear() : year;
    return generateHolidaysForYears([baseYear - 1, baseYear, baseYear + 1, baseYear + 2]);
  }, [showHolidays, view, monthDate, year]);

  const allEntries = useMemo(
    () => (holidayEntries.length ? [...entries, ...holidayEntries] : entries),
    [entries, holidayEntries],
  );

  // Holidays are an overlay. When category filters are active, inject "holiday"
  // so holiday entries also pass; when no filters are active everything shows
  // already so we leave the set empty.
  const effectiveFilters = useMemo<Set<FilterKey>>(() => {
    if (!showHolidays) return filters;
    const next = new Set<string>(filters);
    next.add("holiday");
    return next as Set<FilterKey>;
  }, [filters, showHolidays]);

  const goPrev = () => {
    if (view === "modern") {
      setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1));
    } else {
      setYear(year - 1);
    }
  };
  const goNext = () => {
    if (view === "modern") {
      setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1));
    } else {
      setYear(year + 1);
    }
  };
  const goToday = () => {
    const n = new Date();
    setMonthDate(new Date(n.getFullYear(), n.getMonth(), 1));
    setYear(n.getFullYear());
  };

  const isEmpty = !isLoading && entries.length === 0;

  if (authLoading) {
    return <div className="min-h-screen bg-secondary/40" />;
  }
  if (!user) {
    return <LoginGate />;
  }

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        view === "modern" ? "bg-secondary/40" : "bg-background",
      )}
    >
      <AppMenu onOpenHistory={() => setHistoryOpen(true)} />
      <NotificationBell onOpenHistory={() => setHistoryOpen(true)} />
      <AssistantButton
        entries={entries}
        context={{
          view,
          visibleMonth: monthDate,
          visibleYear: year,
          activeFilters: filters,
          activeCabinLocations: cabinLocations,
          showHolidays,
        }}
        onEditDraft={(d) => {
          setEditingEntry(null);
          setInitialDate(null);
          setDraftEntry(d);
          setEntryOpen(true);
        }}
        onOpenEvent={(e) => {
          const d = new Date(e.start_date + "T00:00:00");
          setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
          setDetailDate(d);
        }}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-32 pt-6 sm:gap-6 sm:pt-10">
        <header className="flex flex-col items-center gap-4 text-center">
          <ProfileChip />
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Hyttekalender
          </h1>
        </header>

        <div className="mx-auto flex rounded-full bg-card p-1 shadow-sm">
          <ToggleBtn
            active={view === "overview"}
            onClick={() => setViewMode("overview")}
            icon={<LayoutGrid className="h-4 w-4" />}
            label="Oversikt"
          />
          <ToggleBtn
            active={view === "modern"}
            onClick={() => setViewMode("modern")}
            icon={<CalendarDays className="h-4 w-4" />}
            label="Moderne"
          />
          <ToggleBtn
            active={view === "excel"}
            onClick={() => setViewMode("excel")}
            icon={<Table2 className="h-4 w-4" />}
            label="Excel"
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={toggleAll}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all sm:text-base",
                allActive
                  ? "bg-foreground text-background shadow-md"
                  : "bg-card text-muted-foreground hover:bg-secondary",
              )}
            >
              Alt
            </button>
            {FILTERS.map((f) => {
              const active = filters.has(f.key);
              const meta = FILTER_META[f.key as Exclude<typeof f.key, "holiday">];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFilter(f.key)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 sm:text-base",
                    active
                      ? cn(meta.color, "border-transparent shadow-md scale-[1.03]")
                      : cn(meta.soft, "border-current/20 opacity-80 hover:opacity-100 hover:scale-[1.02]"),
                  )}
                >
                  {f.label}
                </button>
              );
            })}
            {(() => {
              const meta = CATEGORY_META.holiday;
              return (
                <button
                  type="button"
                  onClick={() => setShowHolidays((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 sm:text-base",
                    showHolidays
                      ? cn(meta.color, "border-transparent shadow-md scale-[1.03]")
                      : cn(meta.soft, "border-current/20 opacity-80 hover:opacity-100 hover:scale-[1.02]"),
                  )}
                  title="Vis norske høytider og helligdager"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Høytider
                </button>
              );
            })()}
          </div>
        </div>

        <CalendarNav
          view={view}
          monthDate={monthDate}
          year={year}
          onPrev={goPrev}
          onNext={goNext}
          onJumpMonth={(d) => setMonthDate(d)}
          onJumpYear={(y) => setYear(y)}
          onToday={goToday}
        />

        {view === "modern" && (
          <CalendarGrid
            monthDate={monthDate}
            entries={allEntries}
            filters={effectiveFilters}
            cabinLocations={cabinLocations}
            onDayClick={(d) => setDetailDate(d)}
          />
        )}
        {view === "overview" && (
          <YearOverview
            year={year}
            entries={allEntries}
            filters={effectiveFilters}
            cabinLocations={cabinLocations}
            onDayClick={(d) => {
              setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
              setDetailDate(d);
            }}
          />
        )}
        {view === "excel" && (
          <ExcelView
            year={year}
            entries={allEntries}
            filters={effectiveFilters}
            cabinLocations={cabinLocations}
            onDayClick={(d) => {
              setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1));
              setDetailDate(d);
            }}
          />
        )}

        <CalendarNav
          view={view}
          monthDate={monthDate}
          year={year}
          onPrev={goPrev}
          onNext={goNext}
          onJumpMonth={(d) => setMonthDate(d)}
          onJumpYear={(y) => setYear(y)}
          onToday={goToday}
        />

        {isEmpty && (
          <div className="rounded-3xl bg-card p-8 text-center shadow-sm">
            <p className="text-lg text-muted-foreground">
              Ingen oppføringer ennå. Trykk på en dato eller knappen under for å starte.
            </p>
          </div>
        )}
      </div>

      {view === "overview" && <OverviewLegend />}

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl">
            <Button
              size="lg"
              className="h-16 w-full rounded-2xl text-lg font-semibold shadow-md"
              onClick={() => {
                setEditingEntry(null);
                setInitialDate(null);
                setDraftEntry(null);
                setEntryOpen(true);
              }}
            >
              <Plus className="!h-6 !w-6" />
              Ny oppføring
            </Button>
          </div>
        </div>
      )}

      <EntryDialog
        open={entryOpen}
        onOpenChange={(o) => {
          setEntryOpen(o);
          if (!o) {
            setEditingEntry(null);
            setDraftEntry(null);
          }
        }}
        initialDate={initialDate}
        entry={editingEntry}
        draft={draftEntry}
      />
      <DayDetailPanel
        date={detailDate}
        entries={entries}
        onOpenChange={(o) => !o && setDetailDate(null)}
        onAdd={() => {
          setEditingEntry(null);
          setInitialDate(detailDate);
          setDetailDate(null);
          setEntryOpen(true);
        }}
        onEdit={(e) => {
          setEditingEntry(e);
          setInitialDate(null);
          setDetailDate(null);
          setEntryOpen(true);
        }}
      />

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl">Historikk</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <HistoryPanel />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-medium transition-all",
        active
          ? "bg-foreground text-background shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}