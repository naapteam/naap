"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SyncBadge } from "./ui/SyncBadge";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import type { Role } from "@/lib/auth/permissions";

type NavItem = { href: string; key: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/", key: "dashboard" },
  { href: "/intake", key: "intake" },
  { href: "/cut-plan", key: "cutPlan" },
  { href: "/stock", key: "stock" },
  { href: "/despatch", key: "despatch" },
  { href: "/reports", key: "reports" },
];

const MASTERS_ITEM: NavItem = { href: "/masters", key: "masters" };

export function AppShell({
  user,
  millName,
  dateLabel,
  children,
}: {
  user: { name: string; role: Role };
  millName: string;
  dateLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("common");
  // UI spec §5: Masters is owner-only in the nav, even though the
  // architecture §9 permission matrix gives manager a narrower ("limited")
  // capability on the resource itself — that capability is for a possible
  // future scoped action, not a promise this nav item is visible to them.
  const items = user.role === "owner" ? [...NAV_ITEMS, MASTERS_ITEM] : NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <KeyboardShortcuts />

      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b-[1.5px] border-[#C9CFD4] bg-white px-3 py-2 min-[840px]:h-14 min-[840px]:flex-nowrap min-[840px]:py-0 min-[840px]:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate font-semibold text-[#14171A]">{millName}</span>
          <span className="hidden text-sm tabular-nums text-[#4A5057] sm:inline">
            {dateLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <SyncBadge status="saved" />
          <form action="/api/logout" method="post">
            <button
              type="submit"
              className="h-8 rounded-md border-[1.5px] border-[#C9CFD4] px-3 text-sm font-semibold text-[#14171A]"
              title={`${user.name} (${user.role})`}
            >
              {t("actions.signOut")}
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <nav className="hidden w-[212px] shrink-0 flex-col gap-1 border-r-[1.5px] border-[#C9CFD4] bg-white p-3 min-[840px]:flex">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-[17px] ${
                  active
                    ? "bg-[#F2F4F5] font-semibold text-[#14171A]"
                    : "text-[#4A5057] hover:bg-[#F2F4F5]"
                }`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 pb-20 min-[840px]:p-6 min-[840px]:pb-6">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch justify-around border-t-[1.5px] border-[#C9CFD4] bg-white min-[840px]:hidden">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 items-center justify-center px-1 text-center text-xs ${
                active ? "font-semibold text-[#14171A]" : "text-[#4A5057]"
              }`}
            >
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
