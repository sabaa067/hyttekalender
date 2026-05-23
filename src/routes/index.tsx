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
import { AppMenu } from "@/components/AppMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { LoginGate } from "@/components/LoginGate";
import { HistoryPanel } from "@/components/HistoryPanel";
import { ProfileChip } from "@/components/ProfileChip";
import { BiometricGate } from "@/components/BiometricGate";
import { SplashScreen } from "@/components/SplashScreen";
import { useAuth } from "@/lib/auth";
import { usePersistedState } from "@/lib/persisted-state";
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
  const [view, setView] = usePersistedState<ViewMode>("hk_view", "modern");
  const setViewMode = (next: ViewMode) => {
    if (next === "modern") {
      const n = new Date();
      setMonthDate(new Date(n.getFullYear(), n.getMonth(), 1));
    }
    setView(next);
  };
  const ALL_MAIN_FILTERS: FilterKey[] = ["paradis", "fjord", "event", "highlight", "note"];
  const [filters, setFilters] = usePersistedState<Set<FilterKey>>(
    "hk_filters",
    new Set(ALL_MAIN_FILTERS),
    {
      serialize: (s) => Array.from(s),
      deserialize: (raw) =>
        new Set((Array.isArray(raw) ? raw : ALL_MAIN_FILTERS) as FilterKey[]),
    },
  );
  const [cabinLocations] = useState<Set<CabinLoc>>(() => new Set());
  // Høytider is OFF by default and is NOT toggled by "Alt".
  const [showHolidays, setShowHolidays] = usePersistedState<boolean>(
    "hk_holidays",
    false,
  );

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
  const [monthDate, setMonthDate] = usePersistedState<Date>(
    "hk_month",
    (() => {
      const n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), 1);
    })(),
    {
      serialize: (d) => d.toISOString(),
      deserialize: (raw) => {
        const d = new Date(typeof raw === "string" ? raw : Date.now());
        return new Date(d.getFullYear(), d.getMonth(), 1);
      },
    },
  );
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
    return <SplashScreen />;
  }
  if (!user) {
    return <LoginGate />;
  }

  return (
    <BiometricGate>
    <div
      className={cn(
        "min-h-screen transition-colors",
        view === "modern" ? "bg-secondary/40" : "bg-background",
      )}
    >
      {/* Sticky compact top bar */}
      <div
        className="sticky top-0 z-30 border-b border-border/40 bg-background/85 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 pb-2 pt-2 sm:px-4 sm:gap-3 sm:pt-3">
          {/* Row 1: utility icons */}
          <div className="flex items-center justify-between gap-2">
            <AppMenu onOpenHistory={() => setHistoryOpen(true)} />
            <div className="flex items-center gap-2">
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
              <NotificationBell onOpenHistory={() => setHistoryOpen(true)} />
            </div>
          </div>

          {/* Row 2: title + profile */}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Hyttekalender
            </h1>
            <ProfileChip />
          </div>

          {/* Row 3: segmented view control */}
          <div className="flex rounded-full border border-border/40 bg-card/70 p-0.5">
            <ToggleBtn
              active={view === "overview"}
              onClick={() => setViewMode("overview")}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              label="Oversikt"
            />
            <ToggleBtn
              active={view === "modern"}
              onClick={() => setViewMode("modern")}
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Moderne"
            />
            <ToggleBtn
              active={view === "excel"}
              onClick={() => setViewMode("excel")}
              icon={<Table2 className="h-3.5 w-3.5" />}
              label="Excel"
            />
          </div>

          {/* Row 4: filter chips — horizontal scroll on mobile */}
          <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max items-center gap-1.5">
              <button
                type="button"
                onClick={toggleAll}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                  allActive
                    ? "bg-foreground text-background"
                    : "bg-card/70 text-muted-foreground hover:bg-secondary",
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
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                      active
                        ? cn(meta.color, "border-transparent")
                        : cn(meta.soft, "border-border/40 opacity-75 hover:opacity-100"),
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
                      "flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
                      showHolidays
                        ? cn(meta.color, "border-transparent")
                        : cn(meta.soft, "border-border/40 opacity-75 hover:opacity-100"),
                    )}
                    title="Vis norske høytider og helligdager"
                  >
                    <Sparkles className="h-3 w-3" />
                    Høytider
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 pb-32 pt-4 sm:gap-5 sm:px-4">

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
        <SheetContent
          side="right"
          className="w-full overflow-y-auto scroll-pt-[calc(env(safe-area-inset-top,0px)_+_2rem)] pt-[calc(env(safe-area-inset-top,0px)_+_2.25rem)] sm:max-w-md sm:pt-6"
        >
          <SheetHeader className="pr-8">
            <SheetTitle className="text-2xl">Historikk</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <HistoryPanel />
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </BiometricGate>
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
        "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
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