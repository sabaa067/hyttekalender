import { useEffect, useState } from "react";
import { Loader2, Fingerprint } from "lucide-react";
import {
  isBiometricEnabled,
  isBiometricSupported,
  isUnlockedThisSession,
  verifyBiometric,
} from "@/lib/biometric";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

/**
 * If the user has enabled biometric lock, requires the platform biometric
 * prompt to pass before rendering children. Persistent login is unchanged —
 * this is an extra convenience lock on top.
 */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const enabled = isBiometricSupported() && isBiometricEnabled();
  const [unlocked, setUnlocked] = useState(
    () => !enabled || isUnlockedThisSession(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const runPrompt = async () => {
    setError(null);
    setPending(true);
    try {
      await verifyBiometric();
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke verifisere.");
    } finally {
      setPending(false);
    }
  };

  // Auto-trigger on mount so the user instantly sees the Face ID sheet.
  useEffect(() => {
    if (enabled && !unlocked) {
      void runPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary/40 px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card/80 p-8 text-center shadow-xl backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5">
          <Fingerprint className="h-6 w-6 text-foreground/70" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Lås opp</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Bruk Face ID, fingeravtrykk eller enhetslås for å åpne kalenderen.
        </p>
        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
        <Button
          onClick={runPrompt}
          disabled={pending}
          size="lg"
          className="mt-6 h-12 w-full rounded-2xl text-base"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Lås opp"
          )}
        </Button>
        <button
          type="button"
          onClick={logout}
          className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Logg ut i stedet
        </button>
      </div>
    </div>
  );
}