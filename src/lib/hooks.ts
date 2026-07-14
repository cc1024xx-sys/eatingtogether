"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSync(onSync: () => void, intervalMs = 3000) {
  const versionRef = useRef(0);
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/sync");
      const data = await res.json();
      if (data.version !== versionRef.current) {
        versionRef.current = data.version;
        onSyncRef.current();
      }
    } catch {
      // ignore network errors during polling
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, intervalMs]);
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setValue(JSON.parse(stored));
      } catch {
        setValue(initial);
      }
    }
  }, [key, initial]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        localStorage.setItem(key, JSON.stringify(resolved));
        return resolved;
      });
    },
    [key]
  );

  return [value, set] as const;
}
