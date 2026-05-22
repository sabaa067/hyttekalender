import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { fetchActivity, formatDateRange, type ActivityRow, type ActivityAction } from "@/lib/activity";
import { cn } from "@/lib/utils";

const ICON: Record<ActivityAction, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const VERB: Record<ActivityAction, string> = {
  create: "opprettet",
  update: "redigerte",
  delete: "slettet",
};

const TONE: Record<ActivityAction, string> = {
  create: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  update: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  delete: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export function HistoryPanel() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity(200),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">Laster…</p>;
  }
  if (data.length === 0) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">Ingen endringer ennå.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {data.map((a) => (
        <HistoryItem key={a.id} a={a} />
      ))}
    </ul>
  );
}

function HistoryItem({ a }: { a: ActivityRow }) {
  const Icon = ICON[a.action];
  const range = formatDateRange(a.start_date, a.end_date);
  return (
    <li className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE[a.action])}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold text-foreground">{a.actor_name}</span>{" "}
            <span className="text-muted-foreground">{VERB[a.action]}:</span>{" "}
            <span className="font-medium text-foreground">{a.entry_title}</span>
          </p>
          {range && <p className="mt-0.5 text-xs text-muted-foreground">{range}</p>}
          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground/70">
            {format(new Date(a.created_at), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
          </p>
        </div>
      </div>
    </li>
  );
}
