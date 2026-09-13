"use client";

import { createContext, useContext, useState } from "react";
import { deriveRateKey, verifyRateKey } from "@/lib/crypto/rateLock";

export type RateLockConfig = {
  enabled: boolean;
  salt: string | null;
  verifierCiphertext: string | null;
  verifierIv: string | null;
};

type RateLockContextValue = {
  enabled: boolean;
  unlocked: boolean;
  key: CryptoKey | null;
  unlock: (passphrase: string) => Promise<boolean>;
  lock: () => void;
};

const RateLockContext = createContext<RateLockContextValue | null>(null);

/**
 * Holds the derived AES-GCM key in memory only, for this browser tab's
 * lifetime — architecture §8: never persisted, never sent to the server.
 * A refresh or navigation away and back requires re-entering the
 * passphrase; that's the point, not a bug.
 */
export function RateLockProvider({
  config,
  children,
}: {
  config: RateLockConfig;
  children: React.ReactNode;
}) {
  const [key, setKey] = useState<CryptoKey | null>(null);

  async function unlock(passphrase: string): Promise<boolean> {
    if (!config.salt || !config.verifierCiphertext || !config.verifierIv) return false;
    const candidate = await deriveRateKey(passphrase, config.salt);
    const ok = await verifyRateKey(candidate, config.verifierCiphertext, config.verifierIv);
    if (ok) setKey(candidate);
    return ok;
  }

  function lock() {
    setKey(null);
  }

  return (
    <RateLockContext.Provider
      value={{ enabled: config.enabled, unlocked: key !== null, key, unlock, lock }}
    >
      {children}
    </RateLockContext.Provider>
  );
}

export function useRateLock(): RateLockContextValue {
  const ctx = useContext(RateLockContext);
  if (!ctx) throw new Error("useRateLock must be used within RateLockProvider");
  return ctx;
}
