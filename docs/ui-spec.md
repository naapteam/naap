# Naap v1 — UI Specification

**Scope:** 14-day build. Web-first, responsive down to phone.
**Users:** owner and manager/munshi only. Both literate, both fast.
**Languages:** Hindi, Marathi, Gujarati, English.

**Roadmap note:** ledger, invoices, Tally export, labour, e-way bill and WhatsApp are not in this build — they're phase 2/3 (weeks 3–8), sequenced after the pilot has run the money-free version for a few weeks. See the architecture doc §11a for the full phasing and why. Two screens below (compliance, and the mill-switcher slot in the header) are included now because they're near-zero cost, not because their features are complete — see each screen's notes.

---

## 1. Who this is for — and how it changed

Earlier drafts of this product assumed semi-literate shop-floor workers doing two taps each. That's no longer the brief.

The real user is the **munshi**: literate in Marathi or Hindi, fast with numbers, already keeping the same records by hand in a register. He will enter 150–300 rows a day. He does not want big friendly tiles. He wants **speed**.

That inverts several design defaults:

| Old assumption | v1 reality |
|---|---|
| One task per screen | Dense grids, many rows visible |
| Icon-driven, minimal text | Text is fine — just not English-only |
| 64px touch targets everywhere | Keyboard-first on desktop; 48px on phone |
| Confirm every action | Fewer confirmations, easy undo |
| Mobile primary | **Desktop primary**, phone for the yard |

What carries over: numbers are the hero, four languages, high contrast, and nothing ever silently deleted.

The owner is the second user. He opens three screens — dashboard, reconciliation, dead stock — usually on a phone, usually in the evening.

---

## 2. Visual direction

### Where it comes from

Not generic SaaS, and deliberately not "wood-themed" — no brown palettes, no timber textures. The reference is the mill's own marking language: paint dabs on log ends, stencilled bay codes, chalk on stacks. That system already works. Digitise it rather than importing a dashboard aesthetic.

**Colour is a marking system, not decoration.** Six fixed meanings that never change anywhere in the product, plus a per-species colour chip that appears beside every species name, forever. Users navigate by colour within a week.

### Tokens

```
--ink            #14171A    primary text
--ink-soft       #4A5057    secondary — used sparingly
--paper          #FFFFFF    surfaces
--ground         #F2F4F5    page background
--line           #C9CFD4    borders, 1.5px (heavier than typical — screens get dusty)
--line-strong    #8B949C    focus, emphasis
```

Marking colours — semantic, fixed, used as solid chips not tints:

```
--mark-intake    #1B6BB8   blue     incoming logs
--mark-wip       #B5730E   ochre    under conversion, predicted, pending confirm
--mark-ready     #1F7A4D   green    confirmed, dispatched, matched
--mark-idle      #7A3FA8   violet   offcuts, unallocated usable stock
--mark-waste     #5F6B73   slate    byproduct — sawdust, slab, bark
--mark-alert     #C03028   red      variance beyond threshold, overdue, expiry
```

Red appears only when a human decision is needed. Never for routine state.

**Species colours** are set in masters (defaults: teak, sal, babul, neem, mango, eucalyptus, imported). Render as a 10px solid circle before the species name everywhere.

### Typography

**Mukta** as the single family. It ships Devanagari, Gujarati and Latin in one superfamily with matching metrics, so all four languages lay out without per-language hacks. Marathi rides on Devanagari. Weights 400 and 600 only.

```
num-xl    36px / 600 / tabular   dashboard metrics
num-lg    24px / 600 / tabular   totals, predicted vs actual
num-md    17px / 600 / tabular   grid cells
body      16px / 400             default
label     14px / 400 ink-soft    field labels, units
micro     12px / 400             timestamps, IDs
```

`font-variant-numeric: tabular-nums` on every number. CFT columns must align on the decimal — a munshi scans a column of figures, he doesn't read them one by one.

No all-caps. It's illegible in Devanagari and Gujarati and looks like template chrome.

### Density and shape

```
Grid row height       40px desktop, 56px phone
Input height          40px desktop, 52px phone
Button height         40px desktop, 52px phone
Radius                6px
Gutter                16px
Max content width     1400px
```

Tables are real tables on desktop. On phone they become stacked cards — never horizontal scroll.

### Motion

One moment only: a saved row flashes `--mark-ready` at 10% for 400ms then fades. That's the whole motion budget. Respect `prefers-reduced-motion`.

---

## 3. Data entry patterns — the thing that decides adoption

The munshi is replacing a register. If entry is slower than his pen, he stops using it in week two.

1. **Grid entry, not forms.** The tally screen is a spreadsheet-like grid. Enter moves down, Tab moves right, the next row appears automatically.
2. **Repeat-last-value.** Ctrl+D or a small ⤓ button copies the cell above. Log lengths repeat constantly.
3. **Live computation in-row.** Girth and length are typed; CFT appears in the same row instantly, greyed until saved.
4. **Type-ahead everywhere.** Species, party, bay, size — type two characters, arrow down, Enter. Never force a mouse trip to a dropdown.
5. **Size presets as chips.** The mill's ten common sizes sit above the grid. One click inserts a row. Ranked by `use_count`.
6. **Paste from Excel.** Many mills already keep something in a sheet. Accept a paste into the tally grid and map columns. This single feature wins demos.
7. **Undo, not confirm.** A saved row can be reversed for 30 seconds via a toast. Past that, it's cancel-with-reason.
8. **Running totals pinned.** Pieces and CFT fixed at the bottom of the grid, always visible.
9. **Numeric keypad on phone**, standard keyboard on desktop.
10. **Backdating is normal.** A date field on every entry screen, defaulting to today. Don't fight it — he will enter yesterday's work this morning.

Keyboard shortcuts, shown in a `?` overlay: `N` new intake, `C` cut plan, `S` stock, `/` search, `Esc` close.

---

## 4. Localisation

- Language per user, not per device. Switcher in the header, always visible.
- **Latin digits in all four languages.** Devanagari numerals are not used in Indian trade and would confuse.
- Indian digit grouping for any currency: ₹12,45,600.
- Dates DD-MM-YYYY.
- **Trade vocabulary stays in the trade word.** "TP" stays "TP". Do not translate domain terms into formal register.
- Layout must survive 40% string expansion — Marathi and Gujarati labels run long. No fixed-width buttons with centred text.
- Message files `en.json`, `hi.json`, `mr.json`, `gu.json`, semantic keys (`intake.tally.girth`).
- **A trade person per language signs off the glossary before launch.** Machine-translated timber vocabulary will get you laughed out of a mill.

---

## 5. Navigation

Left sidebar, seven items. No nesting.

```
Dashboard
Intake
Cut plan
Stock
Despatch
Reports
Masters          (owner only)
```

Header: mill name (tappable → mill switcher if the owner's account spans more than one mill, otherwise plain text), date, language switcher, sync badge, user menu.

**Mill switcher** only renders for org-level users (`app_user.mill_id IS NULL`). The pilot has one mill, so this is invisible in practice on day one — but the schema and the header slot exist now so a second mill is a data row, not a rebuild.

**Sync badge** — three states, icon plus word, never colour alone: `Saved` (green tick), `Sending` (ochre spinner), `Offline — 6 waiting` (slate). Tappable for detail.

Phone layout: the same seven as a bottom drawer. Owner's phone view defaults straight to Dashboard.

---

## 6. Screens

### 6.1 Dashboard

Owner's screen. Four metric tiles across the top, then two panels.

```
┌────────────┬────────────┬────────────┬────────────┐
│ Intake     │ Output     │ Recovery   │ Dead stock │
│ 480 CFT    │ 268 CFT    │ 55.8%      │ 1,240 CFT  │
│ today      │ today      │ this month │ over 60 days│
└────────────┴────────────┴────────────┴────────────┘

[ Red banner, only when triggered ]
  Unexplained 42 CFT this month.  → Look into it

┌─────────────────────────┬───────────────────────────┐
│ Pending confirmations   │ Prediction accuracy       │
│ 3 cuts awaiting approval│ Last 30 cuts: 24 inside   │
│ → open                  │ range, 6 outside          │
└─────────────────────────┴───────────────────────────┘
```

Also on this screen, small but present: **auto-accept rate per user.** If a manager is confirming 100% of predictions with zero edits, the owner should see it. This is the guard against the tool becoming a rubber stamp.

### 6.2 Intake

**List** — table: date, supplier, vehicle, species chip, pieces, CFT, status pill, variance. Filter row above. `New intake` primary button.

**New intake, step 1 — header**
Supplier (type-ahead), vehicle number, TP number, TP expiry, arrival date/time, declared pieces and CFT (optional — what the supplier claims).

**Step 2 — defect chips**
Six toggles in one row, each with a short label and a one-line explanation on hover:

`End checks` `Sweep` `Taper` `Borer holes` `Hollow sound` `Staining`

Micro copy beneath: *These help the tool predict your output. Tap what you can see.*

**Step 3 — tally grid**

```
Species: [Teak ●]   Convention: Hoppus   Mode: ( Piece | Bulk )

 #    Girth(in)   Length(ft)   CFT        
 1    36          12           6.75      ⤓
 2    34          12           6.02      ⤓
 3    [    ]      [    ]       —
                              ─────────
              Pieces: 2    Total: 12.77 CFT
```

Bulk mode collapses to two fields: total pieces, total CFT. Many mills record "one truck, 480 CFT" — forcing piece-level tally loses half your prospects in the demo.

**Step 4 — close**
Shows tallied vs declared with the gap highlighted. Gap beyond threshold requires a note. Assign bay. Creates the lot with an auto code (`TK-2609-01`).

### 6.3 Cut plan — the centrepiece

**Step 1 — pick lot**
Lot cards: code, species chip, pieces, CFT, age in yard, defect chips shown as small tags.

**Step 2 — target sizes**
Size preset chips above a grid. Each row: thickness, width, length, target quantity. Live CFT per row.

Beneath it, automatically: **offcut matches**. If free offcuts fit any target row, they appear here, oldest first, with bay code and a `Use these` button. A running line at the top: *Using offcuts saves 34 CFT of fresh logs.*

**Step 3 — prediction**

```
Input                          480 CFT

Expected sawn output      250 – 278 CFT     ( 52% – 58% )
  ├ 2×4×12                 140 – 156 pcs
  └ 1×6×10                  88 – 98 pcs
Offcuts                      24 – 38 CFT
Byproduct (slab, sawdust)    77 CFT
Waste                        12 – 20 CFT

Why this range                                    [ show ]
  Species band  52 – 62%
  Large logs    +3
  Size penalty  −2
  Sweep         −4.5
  Borer         −5.0
```

The **why** panel is non-negotiable. The first time the number is wrong, the munshi will ask how it was calculated. If there's no answer on screen, he stops trusting it.

Actions: `Save plan` / `Print cut sheet`.

**Cut sheet** — printable and WhatsApp-shareable image. Large numbers, species colour, bay codes, target sizes, nothing else. No prose.

### 6.4 Confirm — predicted vs actual

The screen that saves 40 minutes a day.

```
Lot TK-2609-01        Cut on 12-09-2026        Predicted 250 – 278 CFT

Size        Predicted    Actual      
2×4×12      140–156      [ 138 ]    ▲
1×6×10       88–98       [  94 ]    ✓
Offcuts      24–38 CFT   [  31 ]    ✓
Byproduct       77 CFT   [  77 ]    ✓

Actual output  244 CFT      Recovery 50.8%
Predicted low  250 CFT      Below range by 6 CFT

Why was it lower?
( Hollow ) ( Borer ) ( Rot ) ( Sweep ) ( Wrong size cut ) ( Operator ) ( Don't know )

                                   [ Confirm ]  [ Cancel ]
```

Rules:
- Actual fields **pre-filled with the prediction midpoint**. Editing is the exception, not the rule.
- A value inside the range shows ✓ in green. Outside shows ▲ in ochre, or red past the hard threshold.
- Outside the range, a variance reason is **required**. No confirm without it.
- Zero edits sets `auto_accepted = true`, which feeds the owner's dashboard.
- Confirming writes conversion, output pieces, offcut pieces and byproduct in one transaction.

### 6.5 Stock

Filter row: form (log / sawn / offcut / byproduct), species chips, size range, bay.

Table: species chip, form, size, pieces, CFT, bay, age in days, status pill.

**Offcut bank** is a saved filter, pinned as a tab. Sorted **oldest first by default** — deliberately, because the whole product exists to stop old wood sitting. Columns: size, species, count, CFT, bay, age, and a `Use in cut plan` action.

**Byproduct** is another tab. Type, quantity in the mill's own unit (trolley, tractor load, bori), bay, and a `Sold` action recording buyer, quantity and rate.

**Lot detail** — the traceability view. Intake header, defect chips, every conversion from that lot, and every piece produced, with status. This is the screen that proves the system is honest.

### 6.6 Despatch

Pick from stock (checkbox list, bay-ordered), customer, vehicle, challan number, TP number, date. Running CFT total. `Record despatch` marks pieces dispatched.

No GST invoice in v1. The challan is a simple printable slip.

### 6.7 Reports

Four tabs, each with a date range and CSV export.

- **Recovery** — line chart by month, table by species / lot / date. Drill to lot.
- **Reconciliation** — the four-bar picture: intake, output, byproduct, dispatched, with `unexplained` called out large. Every unit drillable to the lots contributing.
- **Dead stock** — bars by age band (0–30 / 31–60 / 61–90 / 90+), in CFT. Rupee value appears only if rates are unlocked.
- **Supplier scorecard** — table ranked by average recovery achieved. Minimum two consignments before a supplier appears.

### 6.8 Masters (owner only)

Species (name in four languages, colour, convention, recovery band, byproduct %, minimum offcut size), grades, bays, size presets, parties, users, thresholds, mill profile, **data export**, **rate lock**, **compliance documents**.

### 6.8a Compliance (owner + manager, read-only for others in future roles)

A short list, not a vault. One row per licence or certificate: label, number, issued date, expiry date, and a countdown pill (green → ochre at 60 days → red at 7 days). `Add document` opens a small form — no file attachment in v1, since photos are cut entirely. If the pilot specifically asks for attachment, it's a narrow exception scoped to this screen only, not a reopening of the no-photos decision.

Surfaces on the owner dashboard automatically: any document inside its reminder window appears as a line under the metric tiles, plain text, no red unless inside 7 days.

Parties screen gains a `Broker` kind alongside supplier/customer — schema-only in v1, commission accrual arrives in phase 2 once the ledger exists.

### 6.9 Rate lock

Off by default. When the owner turns it on:

1. Explains plainly: this rate is used only for your own costing, never printed on any document, encrypted so that we cannot read it.
2. Sets a passphrase. Warns clearly that a lost passphrase means unrecoverable data, and requires a typed confirmation.
3. Adds an optional *your working rate* field to intake and despatch, visible to the owner only.
4. Adds a costing column to reports, computed in the browser after unlock.

Field label is *your working rate*. Not "actual rate". Not "cash rate". One field only — never a pair.

---

## 7. Empty and error states

- **No stock matching filter:** "No free teak offcuts above 3 feet." + `Clear filters`.
- **No pending confirmations:** "Nothing waiting. Start a cut plan when you decide sizes." + primary action.
- **Offline:** slate strip, "Working offline — 6 entries waiting to send." Nothing blocks.
- **Prediction unavailable:** if species bands aren't configured, say which master is missing and link to it. Never show a number you can't justify.
- **Errors state the fix:** "Girth is needed to calculate CFT" with the cell highlighted. Never "Validation failed".
- **No delete anywhere.** `Cancel entry` with a reason, shown in slate, stays in the record.

---

## 8. Build order for the UI

1. Layout shell, sidebar, header, sync badge, i18n scaffolding, Mukta, number formatting.
2. Shared components: `DataGrid`, `TypeAhead`, `SpeciesChip`, `StatusPill`, `MetricTile`, `RangeDisplay`, `TotalsBar`.
3. Intake list → new intake → tally grid → close.
4. Stock list with filters, offcut tab, byproduct tab, lot detail.
5. Cut plan: lot pick → targets → offcut matches → prediction with the why panel.
6. Confirm screen.
7. Despatch.
8. Reports, four tabs.
9. Masters, rate lock.
10. Dashboard last — it's a read of everything above.

---

## 9. Quality floor

- Desktop 1366×768 minimum; phone 360px minimum; no horizontal scroll at either.
- Tally grid handles 300 rows without lag on a five-year-old laptop.
- Entry survives connection loss: outbox queues, badge shows count, flush on reconnect.
- Contrast 7:1 on all text — mills have bright sheds and dirty screens.
- Full keyboard operation on desktop; visible focus rings.
- All four languages checked at every type size for Devanagari and Gujarati conjunct rendering.
- Data export to Excel from Masters, one click, everything. Say this in the first sales meeting — it removes the fear that you can hold their data hostage.
