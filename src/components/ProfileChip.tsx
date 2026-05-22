import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function ProfileChip() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  if (!user) return null;
  const isGhost = user.role !== "admin";

  const handleClick = () => {
    if (spinning) return;
    setSpinning(true);
    // Resync everything live
    qc.invalidateQueries({ queryKey: ["entries"] });
    qc.invalidateQueries({ queryKey: ["activity"] });
    window.setTimeout(() => setSpinning(false), 700);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Logget inn som ${user.name} – trykk for å synkronisere`}
      title={`${user.name} · trykk for å oppdatere`}
      className={cn(
        "group inline-flex select-none items-center gap-2 rounded-full border px-3.5 py-1.5",
        "backdrop-blur-md transition-all duration-200",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md active:scale-[0.97]",
        isGhost
          ? "border-border/40 bg-foreground/[0.04] text-muted-foreground"
          : "border-border/60 bg-foreground/[0.06] text-foreground/80",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-transform duration-700 ease-out",
          isGhost ? "bg-muted-foreground/50" : "bg-emerald-500/80",
          spinning && "scale-125",
        )}
      />
      <span
        className={cn(
          "text-sm font-medium tracking-tight transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          spinning && "rotate-[360deg]",
        )}
        style={{ display: "inline-block" }}
      >
        {user.name}
      </span>
    </button>
  );
}
