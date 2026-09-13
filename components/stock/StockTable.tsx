"use client";

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

export function StockTable({
  rows,
  mode = "sized",
}: {
  rows: StockRow[];
  mode?: "sized" | "byproduct";
}) {
  const t = useTranslations("stock");
  const router = useRouter();

  const sizedColumns: DataGridColumn<StockRow>[] = [
    {
      key: "species",
      header: t("list.species"),
      render: (r) =>
        r.speciesNameEn ? (
          <SpeciesChip name={r.speciesNameEn} colorHex={r.speciesColour ?? "#8B949C"} />
        ) : (
          "—"
        ),
    },
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

  const byproductColumns: DataGridColumn<StockRow>[] = [
    {
      key: "species",
      header: t("list.species"),
      render: (r) =>
        r.speciesNameEn ? (
          <SpeciesChip name={r.speciesNameEn} colorHex={r.speciesColour ?? "#8B949C"} />
        ) : (
          "—"
        ),
    },
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

  return (
    <DataGrid
      columns={mode === "byproduct" ? byproductColumns : sizedColumns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => r.lotId && router.push(`/stock/lot/${r.lotId}`)}
      emptyState={<p>{t("empty")}</p>}
    />
  );
}
