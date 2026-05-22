import { useEffect, useState } from "react";
import { Menu, LogIn, LogOut, History, User as UserIcon, Fingerprint } from "lucide-react";
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
          className="fixed left-3 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary sm:left-4"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader>
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
