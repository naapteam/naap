"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Autosaves in-progress form state to localStorage so a refresh (or a
 * dropped connection before the user reaches Close) doesn't lose typed
 * work — the outbox (lib/offline/outbox.ts) only covers the final
 * submission, this covers everything before it.
 */
export function useDraft<T>(key: string, initial: T) {
  const storageKey = `naap-draft:${key}`;
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // corrupt draft — ignore and start fresh
    } finally {
      loaded.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // storage full/unavailable — the in-memory state still works for
      // this session, it just won't survive a refresh
    }
  }, [storageKey, value]);

  function clear() {
    window.localStorage.removeItem(storageKey);
  }

  return [value, setValue, clear] as const;
}
