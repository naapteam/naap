import "server-only";
import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  complianceDoc,
  conversion,
  despatch,
  grade,
  intake,
  location,
  lot,
  party,
  piece,
  sizePreset,
  species,
} from "@/lib/db/schema";

type Column = { header: string; key: string; width?: number };

function addSheet<T extends Record<string, unknown>>(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: T[],
) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
}

// UI spec §6.7a / architecture §11a Day 14: "one click, everything" — the
// full portability export so a mill never feels its own records are locked
// in. Encrypted rate notes (secure_note) are deliberately excluded: the
// server can't decrypt them, so an export could only ever hold ciphertext.
export async function buildMillExportWorkbook(millId: string): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Naap";
  workbook.created = new Date();

  const [
    intakeRows,
    lotRows,
    pieceRows,
    conversionRows,
    despatchRows,
    speciesRows,
    partyRows,
    locationRows,
    sizePresetRows,
    gradeRows,
    complianceRows,
  ] = await Promise.all([
    db
      .select({
        arrivedAt: intake.arrivedAt,
        closedAt: intake.closedAt,
        supplierName: party.name,
        vehicleNo: intake.vehicleNo,
        tpNumber: intake.tpNumber,
        tpExpiry: intake.tpExpiry,
        declaredPieces: intake.declaredPieces,
        declaredCft: intake.declaredCft,
        talliedPieces: intake.talliedPieces,
        talliedCft: intake.talliedCft,
        varianceNote: intake.varianceNote,
        defects: intake.defects,
        status: intake.status,
      })
      .from(intake)
      .leftJoin(party, eq(party.id, intake.supplierId))
      .where(eq(intake.millId, millId))
      .orderBy(asc(intake.arrivedAt)),
    db
      .select({
        code: lot.code,
        speciesName: species.nameEn,
        gradeCode: grade.code,
      })
      .from(lot)
      .leftJoin(species, eq(species.id, lot.speciesId))
      .leftJoin(grade, eq(grade.id, lot.gradeId))
      .where(eq(lot.millId, millId))
      .orderBy(asc(lot.code)),
    db
      .select({
        lotCode: lot.code,
        form: piece.form,
        purpose: piece.purpose,
        speciesName: species.nameEn,
        girthMm: piece.girthMm,
        lengthMm: piece.lengthMm,
        thicknessMm: piece.thicknessMm,
        widthMm: piece.widthMm,
        quantity: piece.quantity,
        uom: piece.uom,
        volumeCft: piece.volumeCft,
        volumeConvention: piece.volumeConvention,
        bayCode: location.code,
        status: piece.status,
        occurredAt: piece.occurredAt,
      })
      .from(piece)
      .leftJoin(lot, eq(lot.id, piece.lotId))
      .leftJoin(species, eq(species.id, piece.speciesId))
      .leftJoin(location, eq(location.id, piece.locationId))
      .where(eq(piece.millId, millId))
      .orderBy(asc(piece.occurredAt)),
    db
      .select({
        lotCode: lot.code,
        kind: conversion.kind,
        predictedOutputLow: conversion.predictedOutputLow,
        predictedOutputHigh: conversion.predictedOutputHigh,
        predictedOffcut: conversion.predictedOffcut,
        predictedByproduct: conversion.predictedByproduct,
        predictedWaste: conversion.predictedWaste,
        inputCft: conversion.inputCft,
        outputCft: conversion.outputCft,
        recoveryPct: conversion.recoveryPct,
        varianceReason: conversion.varianceReason,
        varianceNote: conversion.varianceNote,
        status: conversion.status,
        autoAccepted: conversion.autoAccepted,
        occurredAt: conversion.occurredAt,
        confirmedAt: conversion.confirmedAt,
      })
      .from(conversion)
      .leftJoin(lot, eq(lot.id, conversion.lotId))
      .where(eq(conversion.millId, millId))
      .orderBy(asc(conversion.occurredAt)),
    db
      .select({
        dispatchedAt: despatch.dispatchedAt,
        customerName: party.name,
        vehicleNo: despatch.vehicleNo,
        challanNo: despatch.challanNo,
        tpNumber: despatch.tpNumber,
        totalCft: despatch.totalCft,
        status: despatch.status,
      })
      .from(despatch)
      .leftJoin(party, eq(party.id, despatch.customerId))
      .where(eq(despatch.millId, millId))
      .orderBy(asc(despatch.dispatchedAt)),
    db
      .select()
      .from(species)
      .where(eq(species.millId, millId))
      .orderBy(asc(species.sortOrder)),
    db.select().from(party).where(eq(party.millId, millId)).orderBy(asc(party.name)),
    db
      .select()
      .from(location)
      .where(eq(location.millId, millId))
      .orderBy(asc(location.code)),
    db
      .select()
      .from(sizePreset)
      .where(eq(sizePreset.millId, millId))
      .orderBy(asc(sizePreset.thicknessMm)),
    db.select().from(grade).where(eq(grade.millId, millId)).orderBy(asc(grade.rank)),
    db
      .select()
      .from(complianceDoc)
      .where(eq(complianceDoc.millId, millId))
      .orderBy(asc(complianceDoc.expiresOn)),
  ]);

  addSheet(
    workbook,
    "Intake",
    [
      { header: "Arrived at", key: "arrivedAt", width: 20 },
      { header: "Closed at", key: "closedAt", width: 20 },
      { header: "Supplier", key: "supplierName", width: 20 },
      { header: "Vehicle no", key: "vehicleNo", width: 14 },
      { header: "TP number", key: "tpNumber", width: 14 },
      { header: "TP expiry", key: "tpExpiry", width: 14 },
      { header: "Declared pieces", key: "declaredPieces", width: 14 },
      { header: "Declared CFT", key: "declaredCft", width: 14 },
      { header: "Tallied pieces", key: "talliedPieces", width: 14 },
      { header: "Tallied CFT", key: "talliedCft", width: 14 },
      { header: "Variance note", key: "varianceNote", width: 30 },
      { header: "Defects", key: "defects", width: 24 },
      { header: "Status", key: "status", width: 12 },
    ],
    intakeRows.map((r) => ({ ...r, defects: (r.defects ?? []).join(", ") })),
  );

  addSheet(
    workbook,
    "Lots",
    [
      { header: "Lot code", key: "code", width: 16 },
      { header: "Species", key: "speciesName", width: 18 },
      { header: "Grade", key: "gradeCode", width: 10 },
    ],
    lotRows,
  );

  addSheet(
    workbook,
    "Stock",
    [
      { header: "Lot code", key: "lotCode", width: 16 },
      { header: "Form", key: "form", width: 10 },
      { header: "Purpose", key: "purpose", width: 10 },
      { header: "Species", key: "speciesName", width: 18 },
      { header: "Girth (mm)", key: "girthMm", width: 12 },
      { header: "Length (mm)", key: "lengthMm", width: 12 },
      { header: "Thickness (mm)", key: "thicknessMm", width: 14 },
      { header: "Width (mm)", key: "widthMm", width: 12 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "UoM", key: "uom", width: 10 },
      { header: "Volume CFT", key: "volumeCft", width: 14 },
      { header: "Convention", key: "volumeConvention", width: 12 },
      { header: "Bay", key: "bayCode", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Occurred at", key: "occurredAt", width: 20 },
    ],
    pieceRows,
  );

  addSheet(
    workbook,
    "Conversions",
    [
      { header: "Lot code", key: "lotCode", width: 16 },
      { header: "Kind", key: "kind", width: 10 },
      { header: "Predicted low (CFT)", key: "predictedOutputLow", width: 16 },
      { header: "Predicted high (CFT)", key: "predictedOutputHigh", width: 16 },
      { header: "Predicted offcut (CFT)", key: "predictedOffcut", width: 18 },
      { header: "Predicted byproduct (CFT)", key: "predictedByproduct", width: 20 },
      { header: "Predicted waste (CFT)", key: "predictedWaste", width: 18 },
      { header: "Input (CFT)", key: "inputCft", width: 12 },
      { header: "Output (CFT)", key: "outputCft", width: 12 },
      { header: "Recovery %", key: "recoveryPct", width: 12 },
      { header: "Variance reason", key: "varianceReason", width: 16 },
      { header: "Variance note", key: "varianceNote", width: 28 },
      { header: "Status", key: "status", width: 12 },
      { header: "Auto-accepted", key: "autoAccepted", width: 12 },
      { header: "Occurred at", key: "occurredAt", width: 20 },
      { header: "Confirmed at", key: "confirmedAt", width: 20 },
    ],
    conversionRows,
  );

  addSheet(
    workbook,
    "Despatch",
    [
      { header: "Dispatched at", key: "dispatchedAt", width: 20 },
      { header: "Customer", key: "customerName", width: 20 },
      { header: "Vehicle no", key: "vehicleNo", width: 14 },
      { header: "Challan no", key: "challanNo", width: 14 },
      { header: "TP number", key: "tpNumber", width: 14 },
      { header: "Total CFT", key: "totalCft", width: 12 },
      { header: "Status", key: "status", width: 12 },
    ],
    despatchRows,
  );

  addSheet(
    workbook,
    "Species",
    [
      { header: "Name (EN)", key: "nameEn", width: 18 },
      { header: "Name (HI)", key: "nameHi", width: 18 },
      { header: "Name (MR)", key: "nameMr", width: 18 },
      { header: "Name (GU)", key: "nameGu", width: 18 },
      { header: "Code", key: "code", width: 10 },
      { header: "Convention", key: "defaultConvention", width: 12 },
      { header: "Recovery low %", key: "recoveryLow", width: 14 },
      { header: "Recovery high %", key: "recoveryHigh", width: 14 },
      { header: "Byproduct %", key: "byproductPct", width: 12 },
      { header: "Min offcut length (mm)", key: "minOffcutLengthMm", width: 18 },
      { header: "Min offcut width (mm)", key: "minOffcutWidthMm", width: 18 },
    ],
    speciesRows,
  );

  addSheet(
    workbook,
    "Parties",
    [
      { header: "Kind", key: "kind", width: 10 },
      { header: "Name", key: "name", width: 20 },
      { header: "Phone", key: "phone", width: 14 },
      { header: "Place", key: "place", width: 16 },
      { header: "Commission %", key: "commissionPct", width: 14 },
    ],
    partyRows,
  );

  addSheet(
    workbook,
    "Bays",
    [
      { header: "Code", key: "code", width: 10 },
      { header: "Kind", key: "kind", width: 10 },
    ],
    locationRows,
  );

  addSheet(
    workbook,
    "Size presets",
    [
      { header: "Thickness (mm)", key: "thicknessMm", width: 14 },
      { header: "Width (mm)", key: "widthMm", width: 12 },
      { header: "Length (mm)", key: "lengthMm", width: 12 },
      { header: "Label", key: "label", width: 14 },
      { header: "Use count", key: "useCount", width: 10 },
    ],
    sizePresetRows,
  );

  addSheet(
    workbook,
    "Grades",
    [
      { header: "Code", key: "code", width: 10 },
      { header: "Rank", key: "rank", width: 10 },
    ],
    gradeRows,
  );

  addSheet(
    workbook,
    "Compliance documents",
    [
      { header: "Kind", key: "kind", width: 16 },
      { header: "Label", key: "label", width: 24 },
      { header: "Number", key: "number", width: 16 },
      { header: "Issued on", key: "issuedOn", width: 14 },
      { header: "Expires on", key: "expiresOn", width: 14 },
      { header: "Note", key: "note", width: 28 },
    ],
    complianceRows,
  );

  return workbook;
}
