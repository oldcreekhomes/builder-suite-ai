# Differentiate "No PO" lines from "Over" lines

## The root cause

On the Oxford bill, the PO has one committed line (Excavation $4,650). The bill has two lines:
- **Excavation $2,500** — genuinely matches that PO line
- **Optional Dirt Removal $12,375** — was an *optional* PO line item, treated as a variable cost, not committed

Today, `BillPOSummaryDialog.resolveLineToPoId` falls back to **cost-code matching**: when a bill line has no explicit `purchase_order_line_id`, it auto-links it to any PO that shares the same cost code. Both bill lines share cost code 4200, so both get force-linked to the single Excavation PO line. Their combined $14,875 exceeds $4,650, so both rows display **Over**, and the parent badge in Manage Bills also shows **Over**.

## What we'll change

### 1. Per-line status: introduce "No PO"

In `BillPOSummaryDialog.tsx`:

- **Tighten line resolution.** Drop the unique-cost-code fallback (lines 148-151 of `resolveLineToPoId`). A bill line is only considered linked to a PO if it has an explicit `purchase_order_line_id`, `purchase_order_id`, or a printed `po_reference` that maps to a matched PO. Cost-code alone is no longer sufficient — that prevents auto-attaching variable / optional lines to committed PO lines.
- Lines with no resolved PO already render through the existing "no match" branch. Keep that branch's gray **No PO** badge; this becomes the canonical label for unmatched lines.
- Lines that *are* linked but exceed PO remaining keep showing the red **Over** badge. Lines that fit show **Matched** / **Draw** as today.

Result on the Oxford bill: Excavation row → **Matched** (green), Optional Dirt Removal row → **No PO** (gray).

### 2. Parent badge in Manage Bills: introduce "Partial"

In `usePendingBillPOStatus.ts` (and the matching hook used by approved bills — `useBillPOMatching` / wherever the table reads from), compute the badge by aggregating per-line outcomes using the same resolution rules above:

| Line mix | Parent badge |
|---|---|
| All Matched / Draw | **Matched** (green) |
| Some Matched + some No PO, **no Over** | **Partial** (amber) |
| Any Over line, no Matched lines | **Over** (red) |
| Any Over line **and** any No PO line | **Over + Partial** (two badges side by side) |
| All Over | **Over** |
| All No PO | **No PO** (gray) |

`POStatusBadge` already has a `partial` variant (amber); we'll just start emitting it from the hook. For the "Over + Partial" case we render both badges in the cell, separated by a small gap.

### 3. Dialog header subtitle

The "Bill 33456 — 4 line items across 1 POs" subtitle should reflect the new reality: count only PO-linked lines toward "across N POs". For mixed bills we'll append "· N off-PO" so the count makes sense (e.g. "Bill 33456 — 2 line items across 1 PO · 1 off-PO").

### 4. Dialog totals row

The footer `Total` currently sums all bill lines, which is correct. No change.

## Files touched

- `src/components/bills/BillPOSummaryDialog.tsx` — remove cost-code fallback in `resolveLineToPoId`; subtitle copy.
- `src/hooks/usePendingBillPOStatus.ts` — emit `partial` when mix of linked + No PO; add an "over_and_partial" combined result.
- `src/components/bills/POStatusBadge.tsx` — no new variant needed (already has `partial`); add a small wrapper or render two badges where the table cell is built.
- The Manage Bills table cell that renders the badge — update to render two badges when status is the new combined value.
- `src/hooks/useBillPOMatching.ts` (or wherever approved bills compute their per-row status) — apply the same aggregation rule so Approve and Manage tabs agree.

## Out of scope

- No DB schema changes. `purchase_order_line_id` already exists; we're just trusting it more strictly.
- We are *not* changing how lines get auto-linked during AI extraction. If the extractor still guesses wrong, the user resolves it in the line editor (existing flow).
- No change to journal entries or accounting posting — status is display-only.

## Verification

1. Open Oxford City Concrete bill 33456 → PO Status Summary shows Excavation row **Matched**, Optional Dirt Removal row **No PO**. Subtitle: "Bill 33456 — 1 line item across 1 PO · 1 off-PO".
2. Manage Bills table for that bill shows **Matched** + **No PO** badges side by side (Partial-mix case without overage).
3. The earlier-tested 33606 bill (8 lines across 2 POs, all linked) still shows **Matched** with Draw rows.
4. A bill where every line is over still shows red **Over** at the row and parent level.
5. A truly mixed bill (1 Matched + 1 Over + 1 No PO) shows **Over + Partial** in the parent cell.
