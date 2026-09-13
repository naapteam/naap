"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRateLock } from "@/components/RateLockProvider";
import {
  RATE_LOCK_VERIFIER,
  deriveRateKey,
  encryptWithRateKey,
  generateSalt,
} from "@/lib/crypto/rateLock";

export function RateLockTab() {
  const t = useTranslations("masters.rateLock");
  const router = useRouter();
  const rateLock = useRateLock();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSetup() {
    setError(null);
    if (passphrase.length < 8) {
      setError(t("tooShort"));
      return;
    }
    if (passphrase !== confirm) {
      setError(t("mismatch"));
      return;
    }
    if (!acknowledged) {
      setError(t("mustAcknowledge"));
      return;
    }
    setBusy(true);
    try {
      const salt = generateSalt();
      const key = await deriveRateKey(passphrase, salt);
      const { ciphertext, iv } = await encryptWithRateKey(key, RATE_LOCK_VERIFIER);
      const res = await fetch("/api/masters/rate-lock/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salt, verifierCiphertext: ciphertext, verifierIv: iv }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock() {
    setError(null);
    const ok = await rateLock.unlock(unlockPassphrase);
    if (!ok) setError(t("wrongPassphrase"));
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/masters/rate-lock/disable", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      rateLock.lock();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!rateLock.enabled) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <h2 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h2>
        <p className="text-[#4A5057]">{t("explain1")}</p>
        <p className="text-[#4A5057]">{t("explain2")}</p>
        <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
          {t("passphrase")}
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
          {t("confirmPassphrase")}
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-[#14171A]">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          {t("acknowledge")}
        </label>
        {error && (
          <p className="text-sm text-[#C03028]" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSetup}
          disabled={busy}
          className="h-10 w-fit rounded-md bg-[#1B6BB8] px-4 font-semibold text-white disabled:opacity-60"
        >
          {busy ? t("settingUp") : t("turnOn")}
        </button>
      </div>
    );
  }

  if (!rateLock.unlocked) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <h2 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h2>
        <p className="text-[#4A5057]">{t("enabledLocked")}</p>
        <label className="flex flex-col gap-1 text-sm text-[#4A5057]">
          {t("passphrase")}
          <input
            type="password"
            value={unlockPassphrase}
            onChange={(e) => setUnlockPassphrase(e.target.value)}
            className="h-10 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-[17px] outline-none focus:border-[#8B949C]"
          />
        </label>
        {error && (
          <p className="text-sm text-[#C03028]" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleUnlock}
          className="h-10 w-fit rounded-md bg-[#1B6BB8] px-4 font-semibold text-white"
        >
          {t("unlock")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h2 className="text-[17px] font-semibold text-[#14171A]">{t("title")}</h2>
      <p className="text-[#1F7A4D]">{t("unlockedNotice")}</p>
      {error && (
        <p className="text-sm text-[#C03028]" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleDisable}
        disabled={busy}
        className="h-10 w-fit rounded-md border-[1.5px] border-[#C9CFD4] px-4 font-semibold text-[#14171A] disabled:opacity-60"
      >
        {busy ? t("disabling") : t("turnOff")}
      </button>
    </div>
  );
}
