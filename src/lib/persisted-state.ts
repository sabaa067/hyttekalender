import { useEffect, useRef, useState } from "react";

/**
 * Like useState, but persisted to localStorage under `key`.
 * Safe for SSR — initial read happens on the client only.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  options?: {
    serialize?: (value: T) => unknown;
    deserialize?: (raw: unknown) => T;
  },
) {
  const serialize = options?.serialize ?? ((v: T) => v);
  const deserialize = options?.deserialize ?? ((raw: unknown) => raw as T);

  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  // Load once on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        setValue(deserialize(JSON.parse(raw)));
      }
    } catch {
      /* ignore */
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on change (after initial load)
  useEffect(() => {
    if (!loaded.current) return;
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(serialize(value)));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return [value, setValue] as const;
}