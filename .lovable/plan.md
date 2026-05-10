# Restore cost-code auto-match — but per line, not per PO

## What went wrong

In the previous round we removed the cost-code fallback entirely. That made *both* Oxford lines off-PO (since neither has an explicit `purchase_order_line_id` from the AI extractor), so the parent badge collapsed to grey **No PO** and the dialog has nothing to open against.

Your real intent: the Excavation line ($2,500) should auto-attach to the PO Excavation line ($4,650, $3,700 remaining) because it's the same vendor + same cost code + it *fits*. The Optional Dirt Removal line ($12,375) should stay off-PO because it would overflow the remaining budget — which is exactly the signal that it's a variable/optional cost, not the committed line.

## Fix

Re-introduce cost-code resolution, but **fit-aware and one-line-at-a-time** instead of blanket attribution.

### Resolution rule (both `BillPOSummaryDialog` and `useBillPOMatching`)

For each bill line that has no explicit `purchase_order_line_id`, `purchase_order_id`, or `po_reference` match, look up candidate POs by vendor + project + cost_code, then:

1. Walk bill lines for that cost code in **input order**, tracking each candidate PO's remaining capacity (`po_amount − historical_billed − amount_already_attributed_from_this_bill`).
2. A bill line attaches to a candidate PO only if `line.amount ≤ remaining_capacity` of that PO. First fit wins.
3. If no candidate PO has room, the line stays unattached → **No PO**.

This produces the desired Oxford outcome:
- Excavation $2,500: remaining capacity $3,700 → attaches → **Matched**.
- Optional Dirt Removal $12,375: remaining capacity now $1,200 → doesn't fit → **No PO**.

### Parent badge (already in place)

The aggregation logic added in the prior step already handles this correctly: 1 matched + 1 unmatched → **Partial** (amber). Clicking opens the dialog because `matches.length > 0` now.

### Edge cases

- **Single bill line, fits:** attaches as today. Status **Matched**.
- **Single bill line, doesn't fit:** attaches anyway (legacy behavior — that's how `Over` is detected). Status **Over**. We only skip attribution when there are *competing* bill lines on the same cost code; a lone over-line still resolves so the user sees the red badge.
- **Multiple bill lines, all fit:** all attach, capacity decremented sequentially, all **Matched**.
- **Multiple bill lines, none fit:** first line attaches (becomes **Over**), the rest are **No PO** → parent **Over + Partial**.

## Files

- `src/components/bills/BillPOSummaryDialog.tsx` — replace the now-removed cost-code fallback in `resolveLineToPoId` with the fit-aware version. Because resolution is no longer per-line-stateless, precompute a `Map<billLineId, poId|null>` once per render and have `resolveLineToPoId` look it up.
- `src/hooks/useBillPOMatching.ts` — same fit-aware loop in the bill-iteration block; reuse the existing `sumBilledExcluding` helper plus an in-loop accumulator for amount already attributed from the current bill. Keep the new `unmatchedLineCount` / `over_and_partial` aggregation as-is.

## Verification

1. Open Oxford bill 33456 → table badge shows **Partial** (amber). Click it → dialog opens. Excavation row = **Matched** green; Optional Dirt Removal row = **No PO** grey.
2. Bill 33606 (8 linked lines across 2 POs) → unchanged, still **Matched** with Draw rows inside.
3. A bill where every cost-code line fits → **Matched**.
4. A bill with a single overage line → still **Over** (lone-line attribution preserved).
