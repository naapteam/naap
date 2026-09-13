"use client";

// Offline outbox — architecture §1: "offline-resilient, not offline-first.
// A dropped connection mid-entry will not lose work — entries queue
// locally and flush on reconnect." This queues at the granularity of one
// whole submission (e.g. one intake close), not individual keystrokes —
// the in-progress wizard state itself is protected separately (see
// useDraftState) so a dropped connection or a refresh before submitting
// still doesn't lose the tally rows being typed.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type OutboxItem = {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  createdAt: number;
  label: string;
};

interface OutboxDB extends DBSchema {
  pending: {
    key: number;
    value: OutboxItem;
  };
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<OutboxDB>("naap-outbox", 1, {
      upgrade(db) {
        db.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
      },
    });
  }
  return dbPromise;
}

export async function enqueue(
  item: Omit<OutboxItem, "id" | "createdAt">,
): Promise<void> {
  const db = await getDb();
  await db.add("pending", { ...item, createdAt: Date.now() });
}

export async function listPending(): Promise<OutboxItem[]> {
  const db = await getDb();
  return db.getAll("pending");
}

/** Send everything queued, in order; stops at the first failure so later
 * items don't jump ahead of ones the server hasn't seen yet. */
export async function flush(): Promise<{ sent: number; remaining: number }> {
  const db = await getDb();
  const items = await db.getAll("pending");
  let sent = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (!res.ok) break;
      await db.delete("pending", item.id!);
      sent++;
    } catch {
      break;
    }
  }
  const remaining = (await db.getAll("pending")).length;
  return { sent, remaining };
}

export type SubmitResult =
  | { ok: true; queued: false; data: unknown }
  | { ok: true; queued: true }
  | { ok: false; error: string };

/** Try the request now; if the network itself fails, queue it for later
 * instead of losing it. An HTTP error response (validation, auth) is
 * returned as a real failure — retrying that unchanged would just fail
 * again. */
export async function submitOrQueue(item: {
  url: string;
  method: string;
  body: unknown;
  label: string;
}): Promise<SubmitResult> {
  try {
    const res = await fetch(item.url, {
      method: item.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.body),
    });
    if (res.ok) {
      return { ok: true, queued: false, data: await res.json() };
    }
    const errBody = await res.json().catch(() => ({}));
    return {
      ok: false,
      error:
        typeof errBody.error === "string"
          ? errBody.error
          : `Request failed (${res.status})`,
    };
  } catch {
    await enqueue(item);
    return { ok: true, queued: true };
  }
}
