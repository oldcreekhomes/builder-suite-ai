# Fix "Billed to Date" on the PO Status Summary (LCS, 100 Nob Hill)

## What's wrong (confirmed from the data)
The app is undercounting what you've already billed. Real numbers on bill 26753 (8/17/2026):

| PO | Billed before 26753 (actual) | App shows |
|---|---|---|
| 2026-100N-0013 Sediment & Erosion | $14,256.30 (25952 $11,406.30 + 26212 $200 + 26404 $650 + 26578 $2,000) | $0.00 |
| 2026-100N-0014 Earthwork | $212,754.00 (600 + 155,954 + 45,200 + 11,000) | $0.00 |
| 2026-100N-0015 Demolition | $30,405.90 | $30,605.90 (includes a later bill) |

Two causes:
1. **Row cap.** The app pulls every billed line for these POs in one request. Nob Hill bills split each line across 19 lots, so there are thousands of lines and the request silently stops at 1,000. Whole PO histories get dropped, so Billed to Date shows $0 and Remaining looks far too high.
2. **Future bills counted.** Billed to Date includes bills dated after the one you're viewing (e.g. 26928 from 9/18). It should only include earlier bills.

Your formula stays exactly: **PO Amount − Billed to Date − This Bill = Remaining**.

## Changes
1. Load all billed lines for the POs in pages (no 1,000 cap) in the PO matching logic and the vendor PO lookup used by the summary.
2. Billed to Date = approved/paid bills dated **before** this bill (same-date bills ordered by entry), excluding archived, reversed and this bill itself.
3. Same fix applies everywhere this summary/PO status badge appears (Review, Rejected, Approved, Paid, and bill entry).
4. After the fix, re-check 26753 and 25952 against the table above.

## Technical details
- `src/hooks/useBillPOMatching.ts` (~line 184) and `src/hooks/useVendorPurchaseOrders.ts` (bill_lines queries): use `src/lib/supabasePaginate.ts` + batched `.in()`; select `bills.bill_date, created_at, archived_at`; filter archived and bills with date > current bill date.
- `sumBilledExcluding` becomes per-bill "prior to" sum using the bill's date.
- Add a small unit test for the prior-bills sum rule.
