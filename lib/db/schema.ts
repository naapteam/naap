// Drizzle schema — mirrors architecture doc §3 table-for-table.
// Nothing here is ever hard-deleted from the app layer: cancel sets
// cancelled_at + a reason and writes audit_log instead.
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  date,
  bigserial,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ============ Tenancy & users ============

export const org = pgTable("org", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const mill = pgTable("mill", {
  id: id(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => org.id),
  name: text("name").notNull(),
  address: text("address"),
  defaultLocale: text("default_locale").notNull().default("hi"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: createdAt(),
});

// role: owner | manager | accounts | gate | operator | loader | auditor | support
export const appUser = pgTable("app_user", {
  id: id(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => org.id),
  millId: uuid("mill_id").references(() => mill.id), // NULL = org-level (all mills)
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  role: text("role").notNull(),
  pinHash: text("pin_hash"),
  locale: text("locale").notNull().default("hi"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

// ============ Compliance vault (v1 — no integration, tracked expiry only) ============

// kind: sawmill_licence | gst_cert | pollution_consent | factory_licence | other
export const complianceDoc = pgTable("compliance_doc", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  number: text("number"),
  issuedOn: date("issued_on"),
  expiresOn: date("expires_on"),
  reminderDays: integer("reminder_days")
    .array()
    .notNull()
    .default(sql`'{60,30,7}'`),
  note: text("note"),
  createdAt: createdAt(),
});

// ============ Masters ============

export const species = pgTable("species", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  nameEn: text("name_en").notNull(),
  nameHi: text("name_hi"),
  nameMr: text("name_mr"),
  nameGu: text("name_gu"),
  colourHex: text("colour_hex").notNull(),
  // hoppus | true | cbm
  defaultConvention: text("default_convention").notNull().default("hoppus"),
  recoveryLow: numeric("recovery_low", { precision: 5, scale: 2 }).notNull(),
  recoveryHigh: numeric("recovery_high", { precision: 5, scale: 2 }).notNull(),
  byproductPct: numeric("byproduct_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("18"),
  minOffcutLengthMm: integer("min_offcut_length_mm").notNull().default(450),
  minOffcutWidthMm: integer("min_offcut_width_mm").notNull().default(50),
  sortOrder: integer("sort_order").default(0),
});

export const grade = pgTable("grade", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  code: text("code").notNull(),
  labels: jsonb("labels").notNull().default({}),
  rank: integer("rank").notNull(),
});

// kind: yard | wip | rack | shed | despatch
export const location = pgTable(
  "location",
  {
    id: id(),
    millId: uuid("mill_id")
      .notNull()
      .references(() => mill.id),
    code: text("code").notNull(),
    kind: text("kind").notNull().default("yard"),
  },
  (t) => [uniqueIndex("location_mill_code_uq").on(t.millId, t.code)],
);

export const sizePreset = pgTable("size_preset", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  thicknessMm: integer("thickness_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  lengthMm: integer("length_mm").notNull(),
  label: text("label"),
  useCount: integer("use_count").notNull().default(0),
});

// kind: supplier | customer | both | broker
export const party = pgTable("party", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  place: text("place"),
  // only meaningful when kind = 'broker'
  commissionPct: numeric("commission_pct", { precision: 5, scale: 2 }),
});

// ============ Intake ============

export const intake = pgTable("intake", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  supplierId: uuid("supplier_id").references(() => party.id),
  vehicleNo: text("vehicle_no"),
  tpNumber: text("tp_number"),
  tpExpiry: date("tp_expiry"),
  declaredPieces: integer("declared_pieces"),
  declaredCft: numeric("declared_cft", { precision: 12, scale: 3 }),
  talliedPieces: integer("tallied_pieces").notNull().default(0),
  talliedCft: numeric("tallied_cft", { precision: 12, scale: 3 })
    .notNull()
    .default("0"),
  varianceNote: text("variance_note"),
  // end_checks | sweep | taper | borer | hollow | stain
  defects: text("defects")
    .array()
    .notNull()
    .default(sql`'{}'`),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  // open | closed | cancelled
  status: text("status").notNull().default("open"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  createdAt: createdAt(),
});

export const lot = pgTable(
  "lot",
  {
    id: id(),
    millId: uuid("mill_id")
      .notNull()
      .references(() => mill.id),
    intakeId: uuid("intake_id").references(() => intake.id),
    code: text("code").notNull(), // auto: TK-2609-01
    speciesId: uuid("species_id")
      .notNull()
      .references(() => species.id),
    gradeId: uuid("grade_id").references(() => grade.id),
  },
  (t) => [uniqueIndex("lot_mill_code_uq").on(t.millId, t.code)],
);

// ============ CORE OBJECT 1 ============

export const piece = pgTable(
  "piece",
  {
    id: id(),
    millId: uuid("mill_id")
      .notNull()
      .references(() => mill.id),
    lotId: uuid("lot_id").references(() => lot.id),

    // log | cant | sawn | offcut | byproduct
    form: text("form").notNull(),
    // primary | offcut | byproduct | waste
    purpose: text("purpose").notNull(),
    speciesId: uuid("species_id")
      .notNull()
      .references(() => species.id),
    gradeId: uuid("grade_id").references(() => grade.id),

    girthMm: integer("girth_mm"),
    lengthMm: integer("length_mm"),
    thicknessMm: integer("thickness_mm"),
    widthMm: integer("width_mm"),

    quantity: numeric("quantity", { precision: 12, scale: 3 })
      .notNull()
      .default("1"),
    // piece | cft | trolley | bag | kg
    uom: text("uom").notNull().default("piece"),
    volumeCft: numeric("volume_cft", { precision: 12, scale: 4 }).notNull(),
    volumeConvention: text("volume_convention").notNull(),

    locationId: uuid("location_id").references(() => location.id),
    // free | reserved | consumed | dispatched | cancelled
    status: text("status").notNull().default("free"),
    isBulk: boolean("is_bulk").notNull().default(false),

    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appUser.id),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
  },
  (t) => [
    index("piece_mill_form_status_idx").on(t.millId, t.form, t.status),
    index("piece_mill_lot_idx").on(t.millId, t.lotId),
    index("piece_offcut_match_idx")
      .on(t.millId, t.speciesId, t.thicknessMm, t.widthMm, t.lengthMm)
      .where(sql`${t.purpose} = 'offcut' AND ${t.status} = 'free'`),
  ],
);

// ============ CORE OBJECT 2 ============

export const conversion = pgTable("conversion", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  // sawing | resaw | split | regrade
  kind: text("kind").notNull().default("sawing"),
  lotId: uuid("lot_id").references(() => lot.id),

  // prediction, written at simulation time
  predictedOutputLow: numeric("predicted_output_low", {
    precision: 12,
    scale: 4,
  }),
  predictedOutputHigh: numeric("predicted_output_high", {
    precision: 12,
    scale: 4,
  }),
  predictedOffcut: numeric("predicted_offcut", { precision: 12, scale: 4 }),
  predictedByproduct: numeric("predicted_byproduct", {
    precision: 12,
    scale: 4,
  }),
  predictedWaste: numeric("predicted_waste", { precision: 12, scale: 4 }),
  predictionBasis: jsonb("prediction_basis"),

  // actuals, written at confirmation
  inputCft: numeric("input_cft", { precision: 14, scale: 4 }),
  outputCft: numeric("output_cft", { precision: 14, scale: 4 }),
  recoveryPct: numeric("recovery_pct", { precision: 6, scale: 3 }),
  // hollow | borer | rot | sweep | wrong_size | operator | unexplained
  varianceReason: text("variance_reason"),
  varianceNote: text("variance_note"),

  // planned | confirmed | cancelled
  status: text("status").notNull().default("planned"),
  autoAccepted: boolean("auto_accepted").notNull().default(false),

  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  confirmedBy: uuid("confirmed_by").references(() => appUser.id),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export const conversionInput = pgTable(
  "conversion_input",
  {
    conversionId: uuid("conversion_id")
      .notNull()
      .references(() => conversion.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id),
    quantityConsumed: numeric("quantity_consumed", {
      precision: 12,
      scale: 3,
    }).notNull(),
    cftConsumed: numeric("cft_consumed", {
      precision: 12,
      scale: 4,
    }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.conversionId, t.pieceId] })],
);

export const conversionOutput = pgTable(
  "conversion_output",
  {
    conversionId: uuid("conversion_id")
      .notNull()
      .references(() => conversion.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id),
  },
  (t) => [primaryKey({ columns: [t.conversionId, t.pieceId] })],
);

// what sizes the munshi asked for, pre-cut
export const conversionTarget = pgTable("conversion_target", {
  id: id(),
  conversionId: uuid("conversion_id")
    .notNull()
    .references(() => conversion.id, { onDelete: "cascade" }),
  thicknessMm: integer("thickness_mm").notNull(),
  widthMm: integer("width_mm").notNull(),
  lengthMm: integer("length_mm").notNull(),
  targetQuantity: numeric("target_quantity", { precision: 12, scale: 3 }),
  predictedQuantity: numeric("predicted_quantity", {
    precision: 12,
    scale: 3,
  }),
  actualQuantity: numeric("actual_quantity", { precision: 12, scale: 3 }),
});

// ============ Despatch ============

export const despatch = pgTable("despatch", {
  id: id(),
  millId: uuid("mill_id")
    .notNull()
    .references(() => mill.id),
  customerId: uuid("customer_id").references(() => party.id),
  vehicleNo: text("vehicle_no"),
  challanNo: text("challan_no"),
  tpNumber: text("tp_number"),
  totalCft: numeric("total_cft", { precision: 12, scale: 4 })
    .notNull()
    .default("0"),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  status: text("status").notNull().default("done"),
});

export const despatchLine = pgTable(
  "despatch_line",
  {
    despatchId: uuid("despatch_id")
      .notNull()
      .references(() => despatch.id, { onDelete: "cascade" }),
    pieceId: uuid("piece_id")
      .notNull()
      .references(() => piece.id),
    cft: numeric("cft", { precision: 12, scale: 4 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.despatchId, t.pieceId] })],
);

// ============ Owner-only encrypted rates ============

export const secureNote = pgTable(
  "secure_note",
  {
    id: id(),
    millId: uuid("mill_id")
      .notNull()
      .references(() => mill.id),
    // 'intake' | 'lot' | 'despatch'
    entityTable: text("entity_table").notNull(),
    entityId: uuid("entity_id").notNull(),
    ciphertext: text("ciphertext").notNull(), // AES-GCM, base64
    iv: text("iv").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("secure_note_entity_uq").on(t.entityTable, t.entityId),
  ],
);

// ============ Audit ============

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  millId: uuid("mill_id").notNull(),
  actorId: uuid("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  // create | update | cancel | confirm | override | export | login
  action: text("action").notNull(),
  entityTable: text("entity_table").notNull(),
  entityId: uuid("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
