"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseJsonResponse } from "@/lib/api";
import type { Message } from "@/lib/types";

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

export function useUnreadMessageCount(activeTab: string) {
  const [authorName] = useLocalStorage("flavor-author", "我");
  const [readAt, setReadAt] = useLocalStorage(
    "flavor-messages-read-at",
    new Date().toISOString()
  );
  const [count, setCount] = useState(0);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      const messages = await parseJsonResponse<Message[]>(res, []);

      if (activeTabRef.current === "together") {
        const latest = messages[0]?.createdAt ?? new Date().toISOString();
        setReadAt(latest);
        setCount(0);
        return;
      }

      const readTime = new Date(readAt).getTime();
      const unread = messages.filter(
        (message) =>
          new Date(message.createdAt).getTime() > readTime &&
          message.authorName !== authorName
      ).length;
      setCount(unread);
    } catch {
      // ignore network errors during polling
    }
  }, [readAt, authorName, setReadAt]);

  useSync(check, 2000);

  return count;
}
