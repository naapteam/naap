"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { flush, listPending, submitOrQueue, type SubmitResult } from "@/lib/offline/outbox";
import type { SyncStatus } from "./ui/SyncBadge";

type OutboxContextValue = {
  status: SyncStatus;
  waitingCount: number;
  refresh: () => Promise<void>;
  submit: (item: {
    url: string;
    method: string;
    body: unknown;
    label: string;
  }) => Promise<SubmitResult>;
};

const OutboxContext = createContext<OutboxContextValue | null>(null);

export function OutboxProvider({ children }: { children: React.ReactNode }) {
  const [waitingCount, setWaitingCount] = useState(0);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const pending = await listPending();
    setWaitingCount(pending.length);
  }, []);

  const tryFlush = useCallback(async () => {
    const pending = await listPending();
    if (pending.length === 0) return;
    setSending(true);
    await flush();
    setSending(false);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(tryFlush, 15000);
    window.addEventListener("online", tryFlush);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", tryFlush);
    };
  }, [refresh, tryFlush]);

  const submit = useCallback<OutboxContextValue["submit"]>(
    async (item) => {
      const result = await submitOrQueue(item);
      await refresh();
      return result;
    },
    [refresh],
  );

  const status: SyncStatus = sending
    ? "sending"
    : waitingCount > 0
      ? "offline"
      : "saved";

  return (
    <OutboxContext.Provider value={{ status, waitingCount, refresh, submit }}>
      {children}
    </OutboxContext.Provider>
  );
}

export function useOutbox(): OutboxContextValue {
  const ctx = useContext(OutboxContext);
  if (!ctx) throw new Error("useOutbox must be used within OutboxProvider");
  return ctx;
}
