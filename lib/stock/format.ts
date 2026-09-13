import { MM_PER_FOOT, MM_PER_INCH } from "@/lib/volume";

export type SizeablePiece = {
  form: string;
  girthMm: number | null;
  lengthMm: number | null;
  thicknessMm: number | null;
  widthMm: number | null;
};

/** Trade-unit size label — logs show girth×length, sawn/offcut show
 * thickness×width×length, byproduct has no dimensional size. */
export function formatPieceSize(p: SizeablePiece): string {
  if (p.form === "log" || p.form === "cant") {
    if (!p.girthMm || !p.lengthMm) return "—";
    const girthIn = Math.round(p.girthMm / MM_PER_INCH);
    const lengthFt = Math.round((p.lengthMm / MM_PER_FOOT) * 10) / 10;
    return `${girthIn}in × ${lengthFt}ft`;
  }
  if (p.thicknessMm && p.widthMm && p.lengthMm) {
    const t = Math.round(p.thicknessMm / MM_PER_INCH);
    const w = Math.round(p.widthMm / MM_PER_INCH);
    const l = Math.round((p.lengthMm / MM_PER_FOOT) * 10) / 10;
    return `${t}×${w}×${l}ft`;
  }
  return "—";
}

export function ageInDays(createdAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
}

export function ageBand(days: number): "0-30" | "31-60" | "61-90" | "90+" {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}
