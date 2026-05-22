import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  describeActivity,
  fetchActivity,
  fetchLastRead,
  markRead,
  type ActivityRow,
} from "@/lib/activity";
import { cn } from "@/lib/utils";

type Props = {
  onOpenHistory: () => void;
};

export function NotificationBell({ onOpenHistory }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState<string | null>(null);

  const { data: activity = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: () => fetchActivity(50),
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  // Initial last-read load
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchLastRead(user.id).then((v) => {
      if (!cancelled) setLastRead(v);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime: refresh activity + entries when anything changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("realtime-activity")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        () => {
          qc.invalidateQueries({ queryKey: ["activity"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_entries" },
        () => {
          qc.invalidateQueries({ queryKey: ["entries"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    return activity.filter(
      (a) =>
        a.actor_id !== user.id &&
        (!lastRead || new Date(a.created_at).getTime() > new Date(lastRead).getTime()),
    ).length;
  }, [activity, user, lastRead]);

  const handleOpenChange = async (next: boolean) => {
    setOpen(next);
    if (next && user) {
      const ts = await markRead(user.id);
      setLastRead(ts);
    }
  };

  if (!user) return null;
  const latest = activity.slice(0, 2);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Varsler"
          className="fixed right-3 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary sm:right-4"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-2">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold text-foreground">Siste hendelser</p>
        </div>
        {latest.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            Ingen hendelser ennå
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {latest.map((a) => (
              <BellItem key={a.id} a={a} mine={a.actor_id === user.id} />
            ))}
          </ul>
        )}
        <div className="mt-1 border-t border-border pt-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenHistory();
            }}
            className="block w-full rounded-xl px-3 py-2 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Se historikk
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BellItem({ a, mine }: { a: ActivityRow; mine: boolean }) {
  return (
    <li
      className={cn(
        "rounded-xl px-3 py-2 text-sm",
        mine ? "bg-secondary/40" : "bg-card hover:bg-secondary",
      )}
    >
      <p className="text-foreground">{describeActivity(a)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: nb })}
      </p>
    </li>
  );
}
