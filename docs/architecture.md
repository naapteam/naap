# Naap v1 — Architecture & Build Spec

**Scope:** 14-day build, plus a phased roadmap through week 8+. Single-mill pilot first. Teak and hardwood, species-agnostic core.
**Stack target:** one deployable web app, offline-resilient, four languages.
**Users:** owner, manager/munshi in v1. Roles table already supports more.

---

## 1. What v1 is

A mill records what came in, plans a cut, confirms what came out, and sees what's lying in the yard.

That is the complete loop that ships in 14 days. Everything past it is a phase, not a cut feature — see §11a for the roadmap and why each item is sequenced where it is.

**In scope — 14 days**

- Log intake with tally and defect indicators
- Cut simulation → predicted output, offcuts, byproduct, waste
- Confirm-or-edit after sawing, with variance reasons
- Stock by form, species, size, bay
- Offcut bank, oldest first
- Despatch (what left, to whom, from which lot)
- Four reports: recovery, reconciliation, dead stock, supplier scorecard
- Optional owner-only rate, client-side encrypted, costing only
- Hindi / Marathi / Gujarati / English
- **Org → mill hierarchy** (multi-mill schema live from day one — see §3.1)
- **Compliance vault** (licence/document expiry tracking, no integration)
- **Broker as a party kind** (schema only — commission logic ships in phase 2)

**Explicitly out of the 14-day build, phased in after — see §11a**

Party ledger, GST invoices, e-way bill, Tally export, labour, WhatsApp, voice entry, ML-learned prediction, native mobile app. Photos remain cut entirely (see prior discussion) — no phase brings them back unless the pilot specifically asks.

**Honest limitation to state up front:** v1 is *offline-resilient*, not offline-first. A dropped connection mid-entry will not lose work — entries queue locally and flush on reconnect. Seven-day disconnected operation is a phase-4 feature and requires a real sync engine. Do not promise it to the pilot mill.

**The pitch stays intact.** None of the phase-1 additions (ledger, invoices) ship before the pilot has run four weeks on the money-free version. Walking in with billing on day one undercuts the "this tool never sees a rupee" opening that gets you in the door.

---

## 2. Stack

| Layer | Choice | Why for 14 days |
|---|---|---|
| App | **Next.js 15, App Router, TypeScript** | One codebase, one deploy, server actions remove the need for a separate API layer. |
| DB | **PostgreSQL 16** (Neon or a Mumbai VPS) | Recursive CTEs for the conversion tree. Data stays in India. |
| ORM | **Drizzle** | Typed schema, fast migrations, no runtime weight. |
| Styling | **Tailwind** | Speed. |
| i18n | **next-intl** | Four locales, JSON message files. |
| Offline queue | **IndexedDB (idb) + outbox pattern** | Entry forms survive connection loss. |
| Auth | **Phone + OTP**, session cookie, 4-digit PIN for quick re-entry | Matches how they log in. |
| Crypto | **WebCrypto AES-GCM**, key from owner passphrase via PBKDF2 | Rate encryption, client-side only. |
| Charts | **Recharts** | Four reports, nothing exotic. |
| Deploy | Single container, Indian region | Data residency is a sales point. |

No Redis, no queue worker, no S3, no microservices. Add them in v2 when there's something to queue.

---

## 3. Data model

Two core objects, same as before. Everything else is support.

```sql
-- ============ Tenancy & users ============
-- Org sits above mill from day one. Retrofitting this after live data exists
-- is genuinely painful — this is the one piece of "future scope" that ships in v1
-- purely because the cost of adding it later is much higher than the cost of adding it now.
CREATE TABLE org (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mill (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id),
  name TEXT NOT NULL,
  address TEXT,
  default_locale TEXT NOT NULL DEFAULT 'hi',
  settings JSONB NOT NULL DEFAULT '{}',   -- thresholds, conventions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- v1 pilot: one org, one mill. The extra join costs nothing now and saves a
-- migration + data backfill later when a second mill owner signs up, or when
-- the pilot mill itself opens a second unit.

CREATE TABLE app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES org(id),
  mill_id UUID REFERENCES mill(id),       -- NULL = access to all mills in the org (owner-level)
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,                     -- owner | manager | accounts | gate | operator | loader | auditor | support
  pin_hash TEXT,
  locale TEXT NOT NULL DEFAULT 'hi',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- v1 only uses owner + manager. Keep all values; adding roles later is a config change, not a migration.

-- ============ Compliance vault (v1 — no integration, just tracked expiry) ============
CREATE TABLE compliance_doc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  kind TEXT NOT NULL,                     -- sawmill_licence | gst_cert | pollution_consent | factory_licence | other
  label TEXT NOT NULL,
  number TEXT,
  issued_on DATE,
  expires_on DATE,
  reminder_days INT[] NOT NULL DEFAULT '{60,30,7}',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No document upload in v1 (photos are cut). This is a register, not a vault yet —
-- number, dates, a countdown pill on the dashboard. Attachment can be added later
-- as a narrow exception (compliance docs only, uploaded from web) without touching
-- the wider no-photos decision.

-- ============ Masters ============
CREATE TABLE species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  name_en TEXT NOT NULL, name_hi TEXT, name_mr TEXT, name_gu TEXT,
  colour_hex TEXT NOT NULL,
  default_convention TEXT NOT NULL DEFAULT 'hoppus',  -- hoppus | true | cbm
  recovery_low NUMERIC(5,2) NOT NULL,     -- seeded industry band
  recovery_high NUMERIC(5,2) NOT NULL,
  byproduct_pct NUMERIC(5,2) NOT NULL DEFAULT 18,     -- slab + sawdust share of input
  min_offcut_length_mm INT NOT NULL DEFAULT 450,
  min_offcut_width_mm INT NOT NULL DEFAULT 50,
  sort_order INT DEFAULT 0
);

CREATE TABLE grade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  code TEXT NOT NULL, labels JSONB NOT NULL DEFAULT '{}', rank INT NOT NULL
);

CREATE TABLE location (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  code TEXT NOT NULL,                     -- 'A1', 'B3', 'Shed-2'
  kind TEXT NOT NULL DEFAULT 'yard',      -- yard | wip | rack | shed | despatch
  UNIQUE (mill_id, code)
);

CREATE TABLE size_preset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  thickness_mm INT NOT NULL, width_mm INT NOT NULL, length_mm INT NOT NULL,
  label TEXT, use_count INT NOT NULL DEFAULT 0
);

CREATE TABLE party (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  kind TEXT NOT NULL,                     -- supplier | customer | both | broker
  name TEXT NOT NULL, phone TEXT, place TEXT,
  commission_pct NUMERIC(5,2)              -- only meaningful when kind = 'broker'
);
-- Broker ships as a party kind + commission field now because it's free —
-- the accrual logic (commission owed against a despatch) is phase-2 work,
-- gated on the ledger existing at all. See §12.

-- ============ Intake ============
CREATE TABLE intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  supplier_id UUID REFERENCES party(id),
  vehicle_no TEXT,
  tp_number TEXT, tp_expiry DATE,
  declared_pieces INT, declared_cft NUMERIC(12,3),
  tallied_pieces INT NOT NULL DEFAULT 0,
  tallied_cft NUMERIC(12,3) NOT NULL DEFAULT 0,
  variance_note TEXT,
  defects TEXT[] NOT NULL DEFAULT '{}',   -- end_checks | sweep | taper | borer | hollow | stain
  arrived_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',    -- open | closed | cancelled
  created_by UUID NOT NULL REFERENCES app_user(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  intake_id UUID REFERENCES intake(id),
  code TEXT NOT NULL,                     -- auto: TK-2609-01
  species_id UUID NOT NULL REFERENCES species(id),
  grade_id UUID REFERENCES grade(id),
  UNIQUE (mill_id, code)
);

-- ============ CORE OBJECT 1 ============
CREATE TABLE piece (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  lot_id UUID REFERENCES lot(id),

  form TEXT NOT NULL,                     -- log | cant | sawn | offcut | byproduct
  purpose TEXT NOT NULL,                  -- primary | offcut | byproduct | waste
  species_id UUID NOT NULL REFERENCES species(id),
  grade_id UUID REFERENCES grade(id),

  girth_mm INT, length_mm INT,            -- logs
  thickness_mm INT, width_mm INT,         -- sawn

  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  uom TEXT NOT NULL DEFAULT 'piece',      -- piece | cft | trolley | bag | kg
  volume_cft NUMERIC(12,4) NOT NULL,
  volume_convention TEXT NOT NULL,

  location_id UUID REFERENCES location(id),
  status TEXT NOT NULL DEFAULT 'free',    -- free | reserved | consumed | dispatched | cancelled
  is_bulk BOOLEAN NOT NULL DEFAULT false,

  occurred_at TIMESTAMPTZ NOT NULL,       -- real-world time, may be backdated
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES app_user(id),
  cancelled_at TIMESTAMPTZ, cancel_reason TEXT
);

CREATE INDEX ON piece (mill_id, form, status);
CREATE INDEX ON piece (mill_id, lot_id);
CREATE INDEX ON piece (mill_id, species_id, thickness_mm, width_mm, length_mm)
  WHERE purpose = 'offcut' AND status = 'free';

-- ============ CORE OBJECT 2 ============
CREATE TABLE conversion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  kind TEXT NOT NULL DEFAULT 'sawing',    -- sawing | resaw | split | regrade
  lot_id UUID REFERENCES lot(id),

  -- prediction, written at simulation time
  predicted_output_low NUMERIC(12,4),
  predicted_output_high NUMERIC(12,4),
  predicted_offcut NUMERIC(12,4),
  predicted_byproduct NUMERIC(12,4),
  predicted_waste NUMERIC(12,4),
  prediction_basis JSONB,                 -- the inputs & factors, for explainability

  -- actuals, written at confirmation
  input_cft NUMERIC(14,4),
  output_cft NUMERIC(14,4),
  recovery_pct NUMERIC(6,3),
  variance_reason TEXT,                   -- hollow | borer | rot | sweep | wrong_size | operator | unexplained
  variance_note TEXT,

  status TEXT NOT NULL DEFAULT 'planned', -- planned | confirmed | cancelled
  auto_accepted BOOLEAN NOT NULL DEFAULT false,  -- true if confirmed with zero edits

  occurred_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES app_user(id),
  confirmed_by UUID REFERENCES app_user(id),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE conversion_input (
  conversion_id UUID NOT NULL REFERENCES conversion(id) ON DELETE CASCADE,
  piece_id UUID NOT NULL REFERENCES piece(id),
  quantity_consumed NUMERIC(12,3) NOT NULL,
  cft_consumed NUMERIC(12,4) NOT NULL,
  PRIMARY KEY (conversion_id, piece_id)
);

CREATE TABLE conversion_output (
  conversion_id UUID NOT NULL REFERENCES conversion(id) ON DELETE CASCADE,
  piece_id UUID NOT NULL REFERENCES piece(id),
  PRIMARY KEY (conversion_id, piece_id)
);

CREATE TABLE conversion_target (      -- what sizes the munshi asked for, pre-cut
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversion_id UUID NOT NULL REFERENCES conversion(id) ON DELETE CASCADE,
  thickness_mm INT NOT NULL, width_mm INT NOT NULL, length_mm INT NOT NULL,
  target_quantity NUMERIC(12,3),
  predicted_quantity NUMERIC(12,3),
  actual_quantity NUMERIC(12,3)
);

-- ============ Despatch ============
CREATE TABLE despatch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  customer_id UUID REFERENCES party(id),
  vehicle_no TEXT, challan_no TEXT, tp_number TEXT,
  total_cft NUMERIC(12,4) NOT NULL DEFAULT 0,
  dispatched_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES app_user(id),
  status TEXT NOT NULL DEFAULT 'done'
);

CREATE TABLE despatch_line (
  despatch_id UUID NOT NULL REFERENCES despatch(id) ON DELETE CASCADE,
  piece_id UUID NOT NULL REFERENCES piece(id),
  cft NUMERIC(12,4) NOT NULL,
  PRIMARY KEY (despatch_id, piece_id)
);

-- ============ Owner-only encrypted rates ============
CREATE TABLE secure_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mill_id UUID NOT NULL REFERENCES mill(id),
  entity_table TEXT NOT NULL,             -- 'intake' | 'lot' | 'despatch'
  entity_id UUID NOT NULL,
  ciphertext TEXT NOT NULL,               -- AES-GCM, base64
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_table, entity_id)
);

-- ============ Audit ============
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  mill_id UUID NOT NULL,
  actor_id UUID NOT NULL, actor_role TEXT NOT NULL,
  action TEXT NOT NULL,                   -- create | update | cancel | confirm | override | export | login
  entity_table TEXT NOT NULL, entity_id UUID NOT NULL,
  before JSONB, after JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Nothing is ever hard-deleted.** Cancel sets `cancelled_at` plus a reason and writes `audit_log`. This is what makes the reconciliation story credible.

---

## 4. Volume mathematics

Single source of truth, `lib/volume.ts`. Test this before writing any UI. An error here destroys credibility on day one.

```ts
// Store all dimensions as integer millimetres. Convert only at the UI edge.
const MM_PER_INCH = 25.4;
const MM_PER_FOOT = 304.8;

/** Hoppus / quarter-girth — the Indian round-log trade standard */
export function hoppusCft(girthMm: number, lengthMm: number): number {
  const girthIn = girthMm / MM_PER_INCH;
  const lengthFt = lengthMm / MM_PER_FOOT;
  return ((girthIn / 4) ** 2 * lengthFt) / 144;
}

/** True geometric volume of a cylinder from girth */
export function trueCft(girthMm: number, lengthMm: number): number {
  const girthIn = girthMm / MM_PER_INCH;
  const lengthFt = lengthMm / MM_PER_FOOT;
  const radiusIn = girthIn / (2 * Math.PI);
  return (Math.PI * radiusIn ** 2 * lengthFt) / 144;
}

/** Sawn timber */
export function sawnCft(tMm: number, wMm: number, lMm: number, qty = 1): number {
  const t = tMm / MM_PER_INCH, w = wMm / MM_PER_INCH, l = lMm / MM_PER_FOOT;
  return ((t * w * l) / 12) * qty;
}

export const cftToCbm = (cft: number) => cft * 0.0283168;
```

Rules:
- `volume_convention` is stamped at creation and **never recalculated**. A mill buying on Hoppus and selling on true volume is normal, and the gap is real margin that must stay visible.
- Round to 4 decimals for storage, 2 for display.
- Hoppus underestimates true volume by roughly 21%. Never "correct" it.

---

## 5. Prediction engine

`lib/predict.ts`. Deterministic arithmetic, no ML. Must be explainable — the owner has to believe the number.

```ts
type PredictInput = {
  inputCft: number;
  species: { recoveryLow: number; recoveryHigh: number; byproductPct: number };
  avgGirthMm: number;
  defects: DefectCode[];
  targets: { thicknessMm: number; widthMm: number; lengthMm: number }[];
};

const DEFECT_DEDUCTION: Record<DefectCode, number> = {
  end_checks: 2.0,   // length loss both ends
  sweep:      4.5,   // geometric, biggest single hit
  taper:      2.5,   // hurts long sizes
  borer:      5.0,   // internal, partly invisible
  hollow:     7.0,   // pith rot
  stain:      0.5,   // grade drop, little volume loss
};

export function predict(i: PredictInput) {
  // 1. base band from species + diameter class
  const dia = i.avgGirthMm / Math.PI;
  const diaBonus = dia >= 600 ? 3 : dia >= 400 ? 0 : -4;   // big logs saw better
  let low  = i.species.recoveryLow  + diaBonus;
  let high = i.species.recoveryHigh + diaBonus;

  // 2. size penalty — large targets from small logs waste more
  const maxDim = Math.max(...i.targets.map(t => Math.max(t.thicknessMm, t.widthMm)));
  const sizePenalty = maxDim > dia * 0.55 ? 5 : maxDim > dia * 0.4 ? 2 : 0;
  low -= sizePenalty; high -= sizePenalty;

  // 3. defect deduction
  const deduction = i.defects.reduce((s, d) => s + DEFECT_DEDUCTION[d], 0);
  low -= deduction; high -= deduction * 0.6;   // upper bound less affected

  low = Math.max(low, 20); high = Math.max(high, low + 3);

  const byproduct = i.inputCft * (i.species.byproductPct / 100);
  const outputLow  = i.inputCft * (low  / 100);
  const outputHigh = i.inputCft * (high / 100);
  const offcut = i.inputCft * (sizePenalty > 0 ? 0.08 : 0.05);
  const waste = Math.max(0, i.inputCft - outputHigh - byproduct - offcut);

  return {
    outputLow, outputHigh, offcut, byproduct, waste,
    recoveryLow: low, recoveryHigh: high,
    basis: { diaBonus, sizePenalty, deduction, defects: i.defects },  // store for explainability
  };
}
```

**Show a range, never a point.** "Expected 52–58% — roughly 310 to 345 CFT." A wrong point estimate destroys trust in one shift; a range that contains the truth builds it every time.

**Store `prediction_basis`.** When the munshi asks "why did it say 52?", the answer must be on screen.

**Seed values** (fill `species.recovery_low/high` at setup, adjust with the pilot mill):

| Species | Band | Byproduct |
|---|---|---|
| Teak | 52–62% | 16% |
| Sal | 50–58% | 18% |
| Babul | 42–52% | 22% |
| Neem | 45–55% | 20% |
| Mango | 45–55% | 20% |
| Eucalyptus | 40–50% | 24% |
| Imported hardwood | 50–60% | 18% |

**Rubber-stamp guard.** When a conversion is confirmed with zero edits, set `auto_accepted = true`. Surface the auto-accept rate per user on the owner dashboard. Require a `variance_reason` whenever actual falls outside the predicted range. If the tool becomes a machine for approving whatever happened, it's worse than no tool.

---

## 6. Offcut matcher

Simple ranked query. No ML.

```sql
SELECT p.*, EXTRACT(DAY FROM now() - p.created_at) AS age_days
FROM piece p
WHERE p.mill_id = $1
  AND p.purpose = 'offcut' AND p.status = 'free'
  AND p.species_id = $2
  AND p.thickness_mm >= $3 AND p.width_mm >= $4 AND p.length_mm >= $5
ORDER BY age_days DESC,                                   -- oldest first, deliberately
         (p.thickness_mm - $3) + (p.width_mm - $4) ASC     -- tightest fit next
LIMIT 5;
```

Two behaviours that matter more than the ranking: **suggest nothing rather than something wrong**, and keep the list to five. A bad suggestion in week one kills the feature permanently.

---

## 7. Reports — write these queries first

```sql
-- Recovery by species and month
SELECT s.name_en, date_trunc('month', c.occurred_at) AS month,
       SUM(c.input_cft) AS input, SUM(c.output_cft) AS output,
       ROUND(SUM(c.output_cft)/NULLIF(SUM(c.input_cft),0)*100, 2) AS recovery_pct
FROM conversion c
JOIN lot l ON l.id = c.lot_id
JOIN species s ON s.id = l.species_id
WHERE c.mill_id = $1 AND c.status = 'confirmed'
GROUP BY 1, 2 ORDER BY 2 DESC;

-- Three-point reconciliation — THE SALES DEMO
WITH i AS (SELECT COALESCE(SUM(tallied_cft),0) v FROM intake
           WHERE mill_id=$1 AND arrived_at BETWEEN $2 AND $3 AND status='closed'),
     o AS (SELECT COALESCE(SUM(output_cft),0) v FROM conversion
           WHERE mill_id=$1 AND occurred_at BETWEEN $2 AND $3 AND status='confirmed'),
     b AS (SELECT COALESCE(SUM(volume_cft),0) v FROM piece
           WHERE mill_id=$1 AND purpose='byproduct' AND occurred_at BETWEEN $2 AND $3),
     d AS (SELECT COALESCE(SUM(total_cft),0) v FROM despatch
           WHERE mill_id=$1 AND dispatched_at BETWEEN $2 AND $3)
SELECT i.v AS intake_cft, o.v AS output_cft, b.v AS byproduct_cft, d.v AS dispatched_cft,
       i.v - (o.v + b.v) AS unexplained_cft
FROM i, o, b, d;

-- Dead stock by age band — THE OTHER SALES DEMO
SELECT CASE WHEN age <= 30 THEN '0-30' WHEN age <= 60 THEN '31-60'
            WHEN age <= 90 THEN '61-90' ELSE '90+' END AS band,
       COUNT(*) AS pieces, ROUND(SUM(volume_cft),2) AS cft
FROM (SELECT *, EXTRACT(DAY FROM now()-created_at) AS age FROM piece
      WHERE mill_id=$1 AND purpose='offcut' AND status='free') x
GROUP BY 1 ORDER BY 1;

-- Supplier scorecard — nobody in this market has this number
SELECT pt.name,
       COUNT(DISTINCT i.id) AS consignments,
       ROUND(SUM(i.tallied_cft),2) AS cft_supplied,
       ROUND(AVG(c.recovery_pct),2) AS avg_recovery_pct
FROM intake i
JOIN party pt ON pt.id = i.supplier_id
JOIN lot l ON l.intake_id = i.id
JOIN conversion c ON c.lot_id = l.id AND c.status='confirmed'
WHERE i.mill_id = $1
GROUP BY 1 HAVING COUNT(DISTINCT i.id) >= 2
ORDER BY avg_recovery_pct DESC;
```

`unexplained_cft` is the number that sells the product. Make every unit of it drillable.

---

## 8. Owner-only rates

One rate field. Never two. Never printed on any document.

- Owner sets a passphrase at setup. Key derived via PBKDF2 (200k iterations, SHA-256), held in memory for the session only, never sent to the server.
- Rate is encrypted client-side with AES-GCM and stored in `secure_note` as ciphertext + IV.
- The server cannot read it. Costing is computed **in the browser**, after decryption.
- If the passphrase is lost, the data is unrecoverable. Say this clearly at setup and make the owner confirm.
- A "local only" toggle skips the server entirely and keeps ciphertext in IndexedDB.
- Field label: *your working rate*. Not "actual rate", not "cash rate".

Ship v1 with rates **off by default**. The pitch is "this tool never sees a rupee." Turn them on only when the mill asks.

---

## 9. Permissions

Enforce in server actions, not just UI. Field roles don't exist in v1 but the checks should already be there.

| Resource | owner | manager | others (v2) |
|---|---|---|---|
| Intake | full | full | create only |
| Cut plan / confirm | full | full | read |
| Stock / offcuts | full | full | read |
| Despatch | full | full | create |
| Reports | full | all except rates | own shift |
| Rates (encrypted) | full | **none** | none |
| Masters / users | full | limited | none |
| Cancel a closed record | full | none | none |
| Compliance vault | full | full | read |
| Other mills in org | full (org-level user) | none | none |

---

## 10. Fourteen-day build order

Each day ends with something runnable. Do not move on with a broken step.

**Day 1** — Repo, Next.js + TS + Tailwind + Drizzle + Postgres. Schema migrated. Seed script: one mill, two users, seven species with bands, ten bays, twenty size presets.

**Day 2** — `lib/volume.ts` and `lib/predict.ts` with full unit tests. Validate Hoppus against a real register page from the pilot mill before proceeding.

**Day 3** — Auth: phone + OTP, session, PIN re-entry, role guard helper. Audit log writer.

**Day 4** — i18n scaffolding, four locale files, language switcher, Mukta font, number formatting (Indian grouping, Latin digits, tabular alignment).

**Day 5** — Intake: header form, supplier picker, dense tally grid, bulk mode toggle, running CFT total, defect chips.

**Day 6** — Intake close: variance vs declared, lot creation, piece rows written, bay assignment. Offline outbox for the tally grid.

**Day 7** — Stock list: filter by form / species / size / bay. Lot detail with lineage.

**Day 8** — Cut simulation screen: pick lot, pick target sizes, call `predict()`, render the range with the basis breakdown visible.

**Day 9** — Confirm screen: predicted vs actual side by side, editable rows, variance reason picker, writes conversion + outputs + offcuts + byproduct atomically.

**Day 10** — Offcut bank: oldest-first list, matcher query, "use these" action that reserves pieces.

**Day 11** — Despatch: pick from stock, challan number, customer, gate out. Stock status transitions.

**Day 12** — Four reports with Recharts. Reconciliation gets the drill-down.

**Day 13** — Owner rate encryption, costing view, masters admin screens, auto-accept rate on dashboard.

**Day 14** — Deploy to Indian region, backup job, full data export to Excel, seed the pilot mill's real masters, end-to-end walkthrough.

---

## 11a. Phased roadmap — weeks 3 onward

Reasoning for the sequencing, not just the list:

- **Some features are cheap and ship in v1** because the cost of retrofitting them later (org/mill hierarchy) or the cost of building them at all (compliance vault, broker schema) is near zero. These are already folded into §1 and §3.
- **Some features are real work but fully within your control.** These are sequenced by dependency and by risk — money-handling features come after the pilot has proven the money-free product, so you don't walk into the first sales conversation with the exact feature that triggers the black-money objection.
- **Some features are blocked by external parties**, not by your team's speed. These start their approval clocks in parallel with other work, because the paperwork takes longer than the code.
- **One feature (ML prediction) is blocked by data that doesn't exist yet.** No amount of engineering time fixes this — it needs roughly 50 confirmed conversions per species before a learned model beats the arithmetic one in §5. Don't start it early; there's nothing to train on.

### Phase 2 — weeks 3–6, in-house build

| Feature | Effort | Depends on |
|---|---|---|
| Party ledger | ~4 days | Nothing — can start immediately after pilot feedback |
| GST invoices | ~4 days | Ledger (shares party + rate infrastructure) |
| Tally export (XML voucher) | ~4 days | Ledger + invoices existing to export from |
| Labour + piece-rate | ~5 days | Nothing — can run in parallel with ledger |
| Broker commission accrual | ~1 day | Ledger (accrual is a ledger entry type) |

Sequencing note: ledger before invoices before Tally, because each is the data source for the next. Labour is independent and can be built by a second engineer in parallel if you have one.

**Gate before starting phase 2:** the pilot mill should have run the money-free v1 for at least four weeks. Introduce billing as an answer to their request, not as something they discover on first login.

### Phase 3 — weeks 7–8, blocked by external approval

Start these applications in **week 3**, in parallel with phase 2 build work, because the approval timelines are longer than the engineering:

| Feature | Blocker | Typical timeline |
|---|---|---|
| E-way bill | GSP contract, sandbox access, production credentials | 2–4 weeks |
| WhatsApp Business API | Meta business verification, then template approval per language | 3–6 weeks, templates can be rejected and resubmitted |

Both integrate against the invoice/despatch data built in phase 2, so code work is short once approval lands — the lead time is entirely administrative. Assign someone to own the applications on day one of phase 2; don't let them wait for the code to be ready first.

### Phase 4 — month 3 onward, data- or scope-gated

| Feature | Gate |
|---|---|
| ML-learned prediction | Minimum ~50 confirmed conversions per species. Check actual counts before starting — a slow-moving species may need longer. Runs *alongside* the arithmetic model at first; only replaces it once it demonstrably beats the arithmetic baseline on held-out batches. |
| Voice entry | Best attempted once you have real transcripts of how munshis actually phrase tallies in Marathi/Gujarati — the pilot's own confirm-screen corrections are a good source of this data. ~5 days engineering, plus accuracy testing per language before enabling by default. |
| Native mobile app | Not a v1 feature with a checkbox — a second project. Needs a real offline sync engine (§6, currently outbox-only). Start once you know from the pilot which flows actually need to run disconnected; don't guess this in advance. |
| Full 7-day offline resilience | Depends on the native app's sync engine. Bundle with the item above. |

### What this means for the sales conversation

Through phase 2, the pitch stays "this tool never sees a rupee" for the first four weeks with any given mill, then becomes "and now it can also handle your billing" once they've asked. Through phase 3, e-way bill and WhatsApp become "yes, and" answers to objections you'll hear in early sales calls — have the applications already in flight so you can say "coming in [month]" rather than "not sure." Phase 4 features are not sales talking points yet; don't promise ML-driven prediction accuracy or a native app to anyone until the data or the sync engine actually exists.

---

## 11. What will bite you after the pilot

Budget two more weeks before mill number two:

1. **Real offline sync.** The outbox handles dropped connections, not days offline.
2. **Multi-tenancy hardening.** Postgres row-level security, not just `WHERE mill_id =`.
3. **Backup and tested restore.** Untested backups are not backups.
4. **Clock drift.** Cheap devices drift and corrupt `occurred_at` ordering. Correct against server time.
5. **Concurrent edits.** Two managers confirming the same conversion.
6. **Translation review.** A trade person per language must sign off the glossary. Machine translation of trade vocabulary will get you laughed out of a mill.

---

## 12. Testing priorities

1. Volume math against real registers from the pilot mill. Non-negotiable.
2. Prediction basis renders correctly and is explainable on screen.
3. Conversion atomicity — inputs consumed and outputs created in one transaction, or neither.
4. Reconciliation arithmetic against a seeded fixture with a known answer.
5. Rate encryption round-trip; confirm the server never sees plaintext.
6. Permission enforcement at the server action layer with a manager token requesting rates.
7. Backdated entry across a month boundary.
8. Devanagari and Gujarati rendering at every type size, with 40% longer strings.
