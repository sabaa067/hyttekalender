import { useState, type FormEvent } from "react";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginGate() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke logge inn");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-secondary/40 px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card/80 p-8 shadow-xl backdrop-blur-xl"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5">
            <Lock className="h-5 w-5 text-foreground/70" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Hyttekalender
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Skriv inn passord for å fortsette
          </p>
        </div>

        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passord"
          className="h-12 rounded-2xl text-center text-base"
          autoFocus
          autoComplete="current-password"
        />

        {error && (
          <p className="mt-3 text-center text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={pending || password.trim().length === 0}
          className="mt-5 h-12 w-full rounded-2xl text-base"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Logg inn"}
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Lukket kalender for familien
        </p>
      </form>
    </div>
  );
}
