

## Fix double-counted "Billed to Date" in PO Status Summary

### Problem
On Bill INV0025 (just approved), the PO Status Summary shows PO `2026-115E-0060`: PO Amount $2,500, Billed to Date $2,500, This Bill $2,500, **Remaining −$2,500, Status "Over"**. Expected: Billed to Date $0, Remaining $0, Status "Matched".

The current bill is being counted twice — once inside `match.total_billed` and again as `thisBillTotal`. The dialog formula is correct:
```
adjustedRemaining = po_amount − total_billed − thisBillTotal
```
…but `total_billed` is wrong because `useBillPOMatching` does **not** exclude the current bill when summing posted/approved bill lines against each PO. (The sibling hook `useVendorPurchaseOrders` already excludes the current bill via `excludeBillId` — this hook should match.)

This breaks every approved bill viewed in the PO Status Summary, not just INV0025.

### Fix

**File: `src/hooks/useBillPOMatching.ts`** — exclude each iterated bill's own lines from `billedLookup`.

1. In the `billedLookup` query (~line 176), also select the linked `bill_id` (already selected) — no change needed there.
2. Stop pre-aggregating `billedLookup` as a flat map. Instead, build a per-PO list of `{ bill_id, amount }` from the approved/paid lines.
3. When iterating `bills.forEach(bill => …)` (~line 214), compute the PO's `totalBilled` for this bill by summing entries whose `bill_id !== bill.id`.

Concretely, replace the current `billedLookup: Map<po_id, number>` with `billedEntriesByPo: Map<po_id, Array<{ bill_id, amount }>>`, then inside the bill loop:
```ts
const totalBilled = (billedEntriesByPo.get(matchedPo.id) || [])
  .filter(e => e.bill_id !== bill.id)
  .reduce((s, e) => s + e.amount, 0);
```

4. Remove the `isDraftBill` branching for `projectedBilled` (~line 340). With the current bill always excluded from `totalBilled`, the projection is uniform:
```ts
const projectedBilled = totalBilled + thisBillAmount;
```
This fixes both draft and approved bills with a single code path and matches `useVendorPurchaseOrders`' behavior. `billedAgainstPo` simplifies to `thisBillAmount`.

5. Also update the candidate PO filter at line 257 (used for auto-resolution): use the same per-PO sum excluding the current bill so auto-resolution doesn't reject POs that look "full" only because the current bill is already on them.

### Verification
- Bill INV0025 PO Status Summary, line for PO `2026-115E-0060`: Billed to Date **$0.00**, Remaining **$0.00**, Status **Matched** (green).
- Lines for PO `2025-115E-0006`: Billed to Date shows only billing from *other* approved bills (not the four INV0025 lines), Remaining = `po_amount − other_bills_billed − $2,700`.
- Re-opening any other already-approved bill's PO Status Summary shows correct Remaining / Status (no more spurious "Over").
- Draft bills behave the same as before (current bill was already excluded from their `total_billed` because draft status is filtered out at line 200).
- Manage Bills "PO Match" status badge column rollups (matched / draw / over_po / numerous) still compute correctly because they consume the same `match.status`, now with accurate `remaining`.

### Files touched
- `src/hooks/useBillPOMatching.ts` only. No DB changes, no other components.

