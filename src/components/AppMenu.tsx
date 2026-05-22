import { useState } from "react";
import { Menu, LogIn, LogOut, History, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Meny"
          className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-secondary sm:left-4 sm:top-4"
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
