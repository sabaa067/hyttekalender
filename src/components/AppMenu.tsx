import { useEffect, useState } from "react";
import { Menu, LogIn, LogOut, History, User as UserIcon, Fingerprint } from "lucide-react";
import { CATEGORY_META, CABIN_LOCATION_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  disableBiometric,
  enableBiometric,
  isBiometricEnabled,
  isBiometricSupported,
} from "@/lib/biometric";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Props = {
  onOpenHistory: () => void;
};

export function AppMenu({ onOpenHistory }: Props) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const supported = isBiometricSupported();
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    if (open) setBioOn(isBiometricEnabled());
  }, [open]);

  const toggleBio = async (next: boolean) => {
    if (!user) return;
    setBioBusy(true);
    try {
      if (next) {
        await enableBiometric({ id: user.id, name: user.name });
        setBioOn(true);
        toast.success("Face ID / biometri aktivert");
      } else {
        disableBiometric();
        setBioOn(false);
        toast.success("Biometri deaktivert");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Kunne ikke aktivere biometri",
      );
    } finally {
      setBioBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Meny"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-foreground transition-colors hover:bg-secondary"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 pt-[calc(env(safe-area-inset-top,0px)_+_2.25rem)] sm:w-96 sm:pt-6">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-2xl">Hyttekalender</SheetTitle>
        </SheetHeader>

        {user && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-secondary/60 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/10">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role === "admin" ? "Redigerer" : "Kun visning"}
              </p>
            </div>
          </div>
        )}

        <nav className="mt-6 flex flex-col gap-1">
          <MenuButton
            icon={<History className="h-4 w-4" />}
            label="Historikk"
            onClick={() => {
              setOpen(false);
              onOpenHistory();
            }}
          />
          {user && supported && (
            <div className="mt-1 flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-secondary/60">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  <Fingerprint className="h-4 w-4" />
                </span>
                <div className="text-left">
                  <p className="text-base font-medium leading-tight">Bruk Face ID</p>
                  <p className="text-xs text-muted-foreground">Lås opp raskt neste gang</p>
                </div>
              </div>
              <Switch
                checked={bioOn}
                disabled={bioBusy}
                onCheckedChange={toggleBio}
              />
            </div>
          )}
          {user ? (
            <MenuButton
              icon={<LogOut className="h-4 w-4" />}
              label="Logg ut"
              onClick={() => {
                logout();
                setOpen(false);
              }}
            />
          ) : (
            <MenuButton
              icon={<LogIn className="h-4 w-4" />}
              label="Logg inn"
              onClick={() => setOpen(false)}
            />
          )}
        </nav>

        <div className="mt-6 rounded-2xl border border-border/50 bg-secondary/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fargeguide
          </p>
          <ul className="grid grid-cols-1 gap-1.5">
            {[
              { label: `Hytte · ${CABIN_LOCATION_META.paradis.label}`, color: "bg-cabin-paradis" },
              { label: `Hytte · ${CABIN_LOCATION_META.fjord.label}`, color: "bg-cabin-fjord" },
              { label: "Arrangement", color: CATEGORY_META.event.dot },
              { label: "Høydepunkt", color: CATEGORY_META.highlight.dot },
              { label: "Notat", color: CATEGORY_META.note.dot },
              { label: "Høytid", color: CATEGORY_META.holiday.dot },
            ].map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={cn("h-3 w-3 shrink-0 rounded-sm", it.color)} />
                <span className="truncate">{it.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      className="h-12 justify-start gap-3 rounded-2xl px-3 text-base font-medium"
      onClick={onClick}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </Button>
  );
}
