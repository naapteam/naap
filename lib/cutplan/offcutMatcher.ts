import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type OffcutMatch = {
  id: string;
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
  volumeCft: string;
  bayCode: string | null;
  ageDays: number;
};

/**
 * Ranked offcut matcher — architecture §6. Oldest first, deliberately
 * (the whole product exists to stop old wood sitting), then tightest fit.
 * Suggests nothing rather than something wrong: exact >= match on every
 * dimension, capped at 5 results.
 */
export async function findOffcutMatches(params: {
  millId: string;
  speciesId: string;
  thicknessMm: number;
  widthMm: number;
  lengthMm: number;
}): Promise<OffcutMatch[]> {
  const { millId, speciesId, thicknessMm, widthMm, lengthMm } = params;
  const rows = await db.execute<{
    id: string;
    thickness_mm: number;
    width_mm: number;
    length_mm: number;
    volume_cft: string;
    bay_code: string | null;
    age_days: number;
  }>(sql`
    SELECT p.id, p.thickness_mm, p.width_mm, p.length_mm, p.volume_cft,
           l.code AS bay_code,
           EXTRACT(DAY FROM now() - p.created_at)::int AS age_days
    FROM piece p
    LEFT JOIN location l ON l.id = p.location_id
    WHERE p.mill_id = ${millId}
      AND p.purpose = 'offcut' AND p.status = 'free'
      AND p.species_id = ${speciesId}
      AND p.thickness_mm >= ${thicknessMm}
      AND p.width_mm >= ${widthMm}
      AND p.length_mm >= ${lengthMm}
    ORDER BY age_days DESC,
             (p.thickness_mm - ${thicknessMm}) + (p.width_mm - ${widthMm}) ASC
    LIMIT 5
  `);

  return rows.rows.map((r) => ({
    id: r.id,
    thicknessMm: r.thickness_mm,
    widthMm: r.width_mm,
    lengthMm: r.length_mm,
    volumeCft: r.volume_cft,
    bayCode: r.bay_code,
    ageDays: r.age_days,
  }));
}
