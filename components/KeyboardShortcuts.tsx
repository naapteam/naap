"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV_KEYS: Record<string, string> = {
  n: "/intake/new",
  c: "/cut-plan",
  s: "/stock",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    el.isContentEditable
  );
}

/** UI spec §3: `N` new intake, `C` cut plan, `S` stock, `?` shortcuts overlay,
 * `Esc` close. Ignored while focus is in an input/select/textarea. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const t = useTranslations("common");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      const path = NAV_KEYS[e.key.toLowerCase()];
      if (path) {
        e.preventDefault();
        router.push(path);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-md border-[1.5px] border-[#C9CFD4] bg-white p-5"
      >
        <h2 className="mb-3 text-[17px] font-semibold text-[#14171A]">
          {t("shortcuts.title")}
        </h2>
        <dl className="flex flex-col gap-2 text-[17px] text-[#14171A]">
          <Row keyLabel="N" label={t("shortcuts.newIntake")} />
          <Row keyLabel="C" label={t("nav.cutPlan")} />
          <Row keyLabel="S" label={t("nav.stock")} />
          <Row keyLabel="?" label={t("shortcuts.title")} />
          <Row keyLabel="Esc" label={t("shortcuts.close")} />
        </dl>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-4 h-10 w-full rounded-md border-[1.5px] border-[#C9CFD4] font-semibold text-[#14171A]"
        >
          {t("shortcuts.close")}
        </button>
      </div>
    </div>
  );
}

function Row({ keyLabel, label }: { keyLabel: string; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[#4A5057]">{label}</dt>
      <dd>
        <kbd className="rounded border-[1.5px] border-[#C9CFD4] bg-[#F2F4F5] px-2 py-0.5 font-mono text-sm">
          {keyLabel}
        </kbd>
      </dd>
    </div>
  );
}
