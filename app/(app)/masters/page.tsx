import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function MastersPage() {
  const session = await getSession();
  if (session?.role !== "owner") redirect("/");

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[17px] font-semibold text-[#14171A]">Masters</h1>
      <p className="text-[#4A5057]">Coming in Day 13 — species, grades, bays, size presets, parties, users, thresholds, mill profile, data export, rate lock, compliance.</p>
    </div>
  );
}
