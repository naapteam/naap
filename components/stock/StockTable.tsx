"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatCft } from "@/lib/i18n/format";
import { formatPieceSize } from "@/lib/stock/format";
import { DataGrid, type DataGridColumn } from "@/components/ui/DataGrid";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import { StatusPill } from "@/components/ui/StatusPill";
import type { MarkTone } from "@/components/ui/tokens";

const STATUS_TONE: Record<string, MarkTone> = {
  free: "idle",
  reserved: "wip",
  consumed: "waste",
  dispatched: "ready",
  cancelled: "waste",
};

export type StockRow = {
  id: string;
  lotId: string | null;
  lotCode: string | null;
  form: string;
  girthMm: number | null;
  lengthMm: number | null;
  thicknessMm: number | null;
  widthMm: number | null;
  quantity: string;
  uom: string;
  volumeCft: string;
  status: string;
  ageDays: number;
  speciesNameEn: string | null;
  speciesColour: string | null;
  bayCode: string | null;
};

function ReserveOffcutButton({ pieceId, status }: { pieceId: string; status: string }) {
  const t = useTranslations("stock");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (status !== "free" && status !== "reserved") return null;

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setPending(true);
    try {
      const res = await fetch("/api/stock/offcut/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pieceId, reserve: status === "free" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`h-8 rounded-md border-[1.5px] px-3 text-sm font-semibold disabled:opacity-60 ${
        status === "reserved"
          ? "border-[#B5730E] text-[#B5730E]"
          : "border-[#1B6BB8] text-[#1B6BB8]"
      }`}
    >
      {status === "reserved" ? t("unreserve") : t("useInCutPlan")}
    </button>
  );
}

export function StockTable({
  rows,
  mode = "sized",
}: {
  rows: StockRow[];
  mode?: "sized" | "byproduct" | "offcut";
}) {
  const t = useTranslations("stock");
  const router = useRouter();

  const speciesColumn: DataGridColumn<StockRow> = {
    key: "species",
    header: t("list.species"),
    render: (r) =>
      r.speciesNameEn ? (
        <SpeciesChip name={r.speciesNameEn} colorHex={r.speciesColour ?? "#8B949C"} />
      ) : (
        "—"
      ),
  };

  const sizedColumns: DataGridColumn<StockRow>[] = [
    speciesColumn,
    { key: "form", header: t("list.form"), render: (r) => t(`form.${r.form}`) },
    { key: "size", header: t("list.size"), render: (r) => formatPieceSize(r) },
    { key: "lot", header: t("list.lot"), render: (r) => r.lotCode ?? "—" },
    {
      key: "pieces",
      header: t("list.pieces"),
      align: "right",
      render: (r) => formatCft(Number(r.quantity)),
    },
    {
      key: "cft",
      header: t("list.cft"),
      align: "right",
      render: (r) => formatCft(Number(r.volumeCft)),
    },
    { key: "bay", header: t("list.bay"), render: (r) => r.bayCode ?? "—" },
    {
      key: "age",
      header: t("list.age"),
      align: "right",
      render: (r) => String(r.ageDays),
    },
    {
      key: "status",
      header: t("list.status"),
      render: (r) => (
        <StatusPill tone={STATUS_TONE[r.status] ?? "idle"} label={t(`status.${r.status}`)} />
      ),
    },
  ];

  const offcutColumns: DataGridColumn<StockRow>[] = [
    ...sizedColumns,
    {
      key: "action",
      header: "",
      render: (r) => <ReserveOffcutButton pieceId={r.id} status={r.status} />,
    },
  ];

  const byproductColumns: DataGridColumn<StockRow>[] = [
    speciesColumn,
    {
      key: "quantity",
      header: t("list.quantity"),
      align: "right",
      // Mill's own unit (trolley, tractor load, bori — UI spec §6.5), not CFT.
      render: (r) => `${formatCft(Number(r.quantity))} ${r.uom}`,
    },
    {
      key: "cft",
      header: t("list.cft"),
      align: "right",
      render: (r) => formatCft(Number(r.volumeCft)),
    },
    { key: "bay", header: t("list.bay"), render: (r) => r.bayCode ?? "—" },
    { key: "age", header: t("list.age"), align: "right", render: (r) => String(r.ageDays) },
    {
      key: "status",
      header: t("list.status"),
      render: (r) => (
        <StatusPill tone={STATUS_TONE[r.status] ?? "waste"} label={t(`status.${r.status}`)} />
      ),
    },
  ];

  const columns =
    mode === "byproduct" ? byproductColumns : mode === "offcut" ? offcutColumns : sizedColumns;

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => r.lotId && router.push(`/stock/lot/${r.lotId}`)}
      emptyState={<p>{t("empty")}</p>}
    />
  );
}
