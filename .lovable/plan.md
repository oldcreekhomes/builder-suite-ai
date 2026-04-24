## Two fixes for multi-lot auto-split bills

### Problem 1 — Edit Extracted Bill math is wrong
Original line on the invoice: **0.3 × $425.00 = $127.50**, then divided across 19 lots ⇒ $6.71 per lot.

Today the split edge function writes each per-lot row as:
- `quantity = 0.3` (untouched)
- `unit_cost = $6.71` (the per-lot share)
- `amount = $6.71`

So the dialog shows `0.3 × 6.71 = $6.71`, which is mathematically nonsense.

**Fix (in `supabase/functions/split-pending-bill-lines/index.ts`):**

Preserve the original **rate** (`unit_cost`) and split the **quantity** instead, so the math reads correctly per row.

For each original line being split across N lots:
- Keep `unit_cost = original.unit_cost` (e.g. `$425.00`).
- Compute `perLotQuantity = original.quantity / N`, rounded to a sensible precision (e.g. 6 decimals to preserve cent-precise totals; the last lot absorbs the rounding remainder so the sum still matches the original total exactly).
- Compute `amount` cents-precisely as today (even split + remainder on the last lot) so per-lot dollar amounts stay `$73.79 … $74.28` in the example.
- Apply the same change in BOTH branches:
  - The first-lot `updates` payload (`unit_cost`, `quantity`, `amount`, `lot_id`, `line_number`).
  - The lots 2..N `inserts` payload (same fields).

Result in the dialog row: `0.0158 × $425.00 = $6.71` (or whatever the chosen quantity precision yields), per lot. Totals, lot allocations, and PO matching stay identical because `amount` is unchanged.

> Note: The tiny per-row `quantity × unit_cost` may differ from `amount` by a fraction of a cent due to rounding. This is already true for many existing bills and is fine because the persisted `amount` is the source of truth (the DB trigger `sync_bill_line_owner_and_amount` only recomputes `amount` from `quantity × unit_cost` when `amount` is null/zero). We will continue to write `amount` explicitly.

### Problem 2 — Cost Code tooltip is a long, repetitive list
For a 19-lot split with one invoice line, the tooltip currently lists:
```
2240: Legal - Land Use   $6.71
2240: Legal - Land Use   $6.71
... (19 rows)
```

The user wants the cost code tooltip to behave like the **Address** tooltip: group by cost code and show one row per unique code with the summed amount.

**Fix (in `src/components/bills/BatchBillReviewTable.tsx`, the `accountDisplayData` IIFE around lines 699–725):**

Change `breakdown` from "one entry per line" to "one entry per unique cost-code/account name":
- Walk `bill.lines` and bucket by display name (`cost_code_name` for `job_cost`, `account_name` for `expense`, fallback `No Cost Code` / `No Account`).
- Sum `amount` per bucket; preserve first-seen order so the primary label stays stable.
- `count` = number of unique buckets (drives the `+N` suffix and the "show breakdown vs single line" decision).
- `total` continues to equal the row total (sum of all line amounts) so it matches the bill total.
- The existing tooltip render block (`accountDisplayData.breakdown.map(...)` + Total row) needs no structural change — it will now render one consolidated row per cost code (e.g. `2240: Legal - Land Use   $1,402.50`).

This mirrors the working Address tooltip pattern the user already approves of.

### Files changed
- `supabase/functions/split-pending-bill-lines/index.ts` — split quantity instead of unit_cost; keep amount math identical.
- `src/components/bills/BatchBillReviewTable.tsx` — group cost-code tooltip breakdown by unique cost code/account, summing amounts.

### Out of scope / unaffected
- Address tooltip on the row (already correct).
- PO matching, totals, balance sheet, journal entries — `amount` per line is unchanged.
- Manual Bill Entry, Write Checks, Credit Cards split-evenly flows — separate code paths, not touched.
- Already-split pending bills will not be re-processed; only new Enter-with-AI auto-splits get the new behavior.

### Verification
1. Re-upload `Gray_Invoice_12429` on the 19-lot project via Enter with AI.
2. Manage Bills row: Cost Code cell shows `2240: Legal - Land Use` with a tooltip of one row: `2240: Legal - Land Use   $1,402.50` (Total $1,402.50).
3. Address tooltip unchanged: Lot 1..19 = $73.79 each (Lot 19 = $74.28), Total $1,402.50.
4. Open Edit Extracted Bill: each row reads `0.0158 × 425.00 = $6.71` (Lot 19 amount = $6.72 to absorb the cent), grouped chronologically Lot 1..19.
5. Approve the bill and confirm posted total = $1,402.50 with the same per-lot allocations as before.