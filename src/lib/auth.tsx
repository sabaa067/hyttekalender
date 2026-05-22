import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { loginWithPassword, logoutSession } from "./auth.functions";

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
const TOKEN_KEY = "hk_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

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
    const result = (await loginWithPassword({ data: { password: pw } })) as {
      token: string;
      user: AppUser;
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    const token = getStoredToken();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    if (token) {
      // best-effort, don't await
      logoutSession({ data: { token } }).catch(() => undefined);
    }
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
