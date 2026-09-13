"use client";

import { useTranslations } from "next-intl";
import { formatCft, formatDate } from "@/lib/i18n/format";
import { DataGrid, type DataGridColumn } from "@/components/ui/DataGrid";
import { SpeciesChip } from "@/components/ui/SpeciesChip";
import { StatusPill } from "@/components/ui/StatusPill";
import type { MarkTone } from "@/components/ui/tokens";

const STATUS_TONE: Record<string, MarkTone> = {
  open: "wip",
  closed: "ready",
  cancelled: "waste",
};

export type IntakeRow = {
  id: string;
  arrivedAt: Date;
  vehicleNo: string | null;
  talliedPieces: number;
  talliedCft: string;
  declaredCft: string | null;
  status: string;
  supplierName: string | null;
  speciesNameEn: string | null;
  speciesColour: string | null;
  lotCode: string | null;
};

export function IntakeListTable({ rows }: { rows: IntakeRow[] }) {
  const t = useTranslations("intake");

  const columns: DataGridColumn<IntakeRow>[] = [
    { key: "date", header: t("list.date"), render: (r) => formatDate(r.arrivedAt) },
    { key: "supplier", header: t("list.supplier"), render: (r) => r.supplierName ?? "—" },
    { key: "vehicle", header: t("list.vehicle"), render: (r) => r.vehicleNo ?? "—" },
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
    { key: "lot", header: t("list.lot"), render: (r) => r.lotCode ?? "—" },
    {
      key: "pieces",
      header: t("list.pieces"),
      align: "right",
      render: (r) => formatCft(r.talliedPieces),
    },
    {
      key: "cft",
      header: t("list.cft"),
      align: "right",
      render: (r) => formatCft(Number(r.talliedCft)),
    },
    {
      key: "variance",
      header: t("list.variance"),
      align: "right",
      render: (r) => {
        if (!r.declaredCft) return "—";
        const diff = Number(r.talliedCft) - Number(r.declaredCft);
        const pct = (Math.abs(diff) / Number(r.declaredCft)) * 100;
        const label = `${diff >= 0 ? "+" : ""}${formatCft(diff)}`;
        return <span className={pct > 5 ? "text-[#C03028]" : undefined}>{label}</span>;
      },
    },
    {
      key: "status",
      header: t("list.status"),
      render: (r) => (
        <StatusPill tone={STATUS_TONE[r.status] ?? "wip"} label={t(`status.${r.status}`)} />
      ),
    },
  ];

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      emptyState={<p>{t("empty")}</p>}
    />
  );
}
