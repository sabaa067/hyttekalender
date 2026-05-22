import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loginWithPassword } from "./auth.functions";

export type AppUser = {
  id: string;
  name: string;
  role: "admin" | "viewer";
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  login: (password: string) => Promise<AppUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "hk_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw) as AppUser);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (password: string) => {
    const pw = password.trim();
    if (!pw) throw new Error("Skriv inn et passord");
    const u = (await loginWithPassword({ data: { password: pw } })) as AppUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
