# Handoff: Naap v1 — UI

## Overview
Naap is a timber-mill operations tool (intake, cut planning with predicted-vs-actual recovery, stock, despatch, reports, masters). This bundle hands off the UI design for the web-first, responsive-to-phone v1 build described in `Naap-UI-SPEC.md` (the source spec — read it in full; it is the authority on product behavior, phasing, and rationale). Primary users are a literate, fast-entry "munshi" (manager) doing 150–300 rows/day, and an owner checking three screens on a phone in the evening. Design intent: light theme throughout, plain and dense (not big touch-friendly tiles), nothing hidden behind jargon — built for non-technical daily users who need speed and trust in the numbers, not a flashy dashboard.

## About the Design Files
`Naap.dc.html` is a **design reference built in HTML** — a single-file interactive prototype showing intended layout, states, and behavior. It is not production code to copy verbatim. The task is to **recreate this design in the target codebase's actual stack** (React/Vue/native/whatever the repo uses) using its existing component patterns, routing, and data layer — or, if this is a fresh codebase, to pick the most suitable stack and implement there. Treat the HTML as the spec for pixels and interaction, not as a dependency.

To view it: open `Naap.dc.html` directly in a browser (no build step needed).

## Fidelity
**High-fidelity for layout, color, type, spacing, and interaction states.** All data shown (mill name, intake rows, stock rows, recovery %, lot codes, report figures) is illustrative mock data — wire to the real API layer. Prediction math (recovery ranges, "why this range" breakdown) is hardcoded to the example in the spec — the real prediction service/algorithm is out of scope for this UI handoff.

## Screens / Views
One `.dc.html` file, one persistent app shell (sidebar/header/mobile bottom nav) with client-side view switching. Views:

1. **Dashboard** — owner's read screen. 4 metric tiles (Intake/Output/Recovery/Dead stock), conditional red "unexplained" banner, two side-by-side panels (pending confirmations, prediction accuracy bar), auto-accept-rate-per-user list.
2. **Intake** — list (table desktop / stacked cards phone) + 4-step "New intake" wizard: Header fields → Defect chips (6 toggles) → Tally grid (Piece/Bulk mode, live CFT computed per row via Hoppus formula `((girth/4)^2 * length)/144`, repeat-last-value ⤓, running totals) → Close (tallied vs declared gap, note, bay assign, lot code).
3. **Cut plan** — 3-step: pick lot (cards) → target sizes grid (thickness/width/length/qty, live CFT) + offcut matches list → prediction (range, breakdown, collapsible "why" panel), Save plan / Print cut sheet actions.
4. **Confirm** — predicted-vs-actual table, actual inputs pre-filled with midpoint, ✓/▲ status per row, variance-reason chips (required when any row is outside predicted range — Confirm button is disabled until a reason is picked), actual output/recovery summary.
5. **Stock** — tabs (All / Offcut bank / Byproduct), filter row, table; row click opens a **Lot detail** traceability view (intake → conversions).
6. **Despatch** — checkbox pick-list from stock with running CFT total, customer/vehicle/challan/TP/date fields, Record despatch.
7. **Reports** — 4 tabs (Recovery, Reconciliation, Dead stock, Supplier scorecard), each a simple bar-style breakdown + table.
8. **Masters** (owner only) — left sub-nav (Species, Grades, Bays, Size presets, Parties, Users, Thresholds, Mill profile, Data export, Rate lock, Compliance). Species table and Compliance (licence countdown pills) and Rate lock (off-by-default toggle, passphrase flow, "your working rate" field) are built out in detail; the remaining sub-tabs show a one-line placeholder describing their contents — build these out from spec §6.8.

### Layout
- App shell: header (56px) + sidebar (212px, desktop ≥840px) + main content (max-width 1400px, centered, 24px padding). Below 840px: sidebar is replaced by a fixed bottom nav (7 items) and content padding drops to 16px.
- Cards/panels: `background: #FFFFFF; border: 1.5px solid #C9CFD4; border-radius: 6px; padding: 20-24px`.
- Tables: real `<table>` on desktop; the same data renders as stacked cards on phone (no horizontal scroll, per spec §9 quality floor).
- Grid rows / inputs / buttons: 40px tall desktop, 52-56px on phone (spec §2 density table — the prototype uses 40/32px consistently; scale up for the phone breakpoint in production per the spec table).

## Interactions & Behavior
- **Nav**: clicking a sidebar/bottom-nav item switches the visible screen (no page reload — client-side).
- **Keyboard shortcuts**: `N` → new intake, `C` → cut plan, `S` → stock, `?` → shortcuts overlay, `Esc` → close overlay. Ignored while focus is in an input/select/textarea.
- **Tally grid**: typing girth+length computes CFT live; a blank trailing row auto-appends; ⤓ copies the row above.
- **Confirm**: editing an actual value recomputes ✓/▲ instantly; Confirm is disabled while any value sits outside its predicted range and no reason chip is selected.
- **Rate lock toggle**: off by default; switching on reveals passphrase + confirmation fields and an explicit "cannot be recovered if lost" warning — no working-rate field should ever ship without this warning gate.
- **Sync badge**: static "Saved" state shown; production needs the 3-state badge from spec §5 (Saved / Sending / Offline — n waiting).
- **Undo, not confirm**: per spec §3.7 — saved rows get a 30s reversible toast in production, not implemented in this prototype (no toast system built).
- No hover/loading/error states beyond what's listed above were built — implement per spec §7 (empty/error states) using the same tone: state the fix, never "Validation failed".

## State Management
Prototype state (mirror shape, not literal code): current screen; intake view (list/wizard) + step + form fields + defects + tally rows + mode; cut-plan step + target rows + "show why" flag; confirm actuals + selected reason; stock tab + open lot detail; despatch selection set; reports tab; masters tab + rate-lock on/off. In production, most of this is server-backed (lots, stock, despatch records) rather than local — only in-progress-entry state (current wizard step, unsaved tally rows) should stay client-side, and should survive a connection drop (spec's outbox/offline requirement, §9).

## Design Tokens
```
Ink            #14171A   primary text
Ink-soft       #4A5057   secondary text
Paper          #FFFFFF   surfaces
Ground         #F2F4F5   page background
Line           #C9CFD4   borders (1.5px)
Line-strong    #8B949C   focus/emphasis

Mark-intake  #1B6BB8  blue    incoming logs
Mark-wip     #B5730E  ochre   under conversion / pending confirm
Mark-ready   #1F7A4D  green   confirmed / dispatched / matched
Mark-idle    #7A3FA8  violet  offcuts / unallocated stock
Mark-waste   #5F6B73  slate   byproduct
Mark-alert   #C03028  red     variance beyond threshold — human decision needed only

Typography — Mukta (400, 600), Google Fonts. Tabular numerals on every number.
num-xl   36px/600   dashboard metrics
num-lg   24px/600   totals, predicted vs actual
num-md   17px/600   grid cells
body     16px/400
label    14px/400  ink-soft
micro    12px/400

Radius 6px · Gutter 16px · Max content width 1400px
Row/input/button height: 40px desktop, 52-56px phone
```
Species chip colors (mock, set per-species in Masters in production): Teak #8B5E34, Sal #C9A227, Babul #6B8E23, Neem #2E7D32, Mango #E07A29, Eucalyptus #4FA8A0, Imported #6C63A6.

Full rationale for every token is in `Naap-UI-SPEC.md` §2 — read it before changing any color or type value.

## Assets
No image/icon assets — the design is intentionally text- and color-first (spec §1: "text is fine — just not English-only", no icon-driven UI). Font is loaded from Google Fonts (`Mukta`). Localization needs a real glossary sign-off per language before launch (spec §4) — do not machine-translate trade vocabulary.

## Files
- `Naap.dc.html` — the interactive design reference (open directly in a browser).
- `Naap-UI-SPEC.md` — the full source product/UI spec. Read this in full; it covers localization, data-entry philosophy, empty/error states, build order, and the phase-2/3 roadmap that this UI intentionally excludes.
