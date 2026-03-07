

## Fix: Correct PO Assignment and Add "Draw" Status for Partial Billings

### Problem
1. **Wrong PO match**: Bills $12,640.64 (ref 379869-070) and $7,373.71 (ref 381241-070) are matching to PO 2026-923T-0052 ($330) instead of PO 2025-923T-0008 ($21,067.73). Both POs share the same vendor, project, and cost code. The fallback disambiguation picks the PO with the closest amount to the bill line (~$6,320), which is $330 — the wrong one.

2. **No "partial draw" indicator**: When a vendor bills in segments (60% draw, 35% draw), the system just shows "Matched." There's no way for the user to see at a glance that a bill is a partial draw against a larger PO.

### Root Cause
The amount-proximity disambiguation in `useBillPOMatching.ts` compares individual **line amounts** ($6,320.32) to **PO totals**, so the $330 PO wins over the $21,067.73 PO. This heuristic fails for partial draws where the bill line is intentionally much smaller than the PO.

### Fix Part 1 — Database: Explicitly Link Bill Lines to Correct PO

SQL migration to set `purchase_order_id` on the 4 bill lines for both bills, pointing them to PO 2025-923T-0008. This prevents future fallback matching issues for these bills.

```sql
UPDATE bill_lines 
SET purchase_order_id = '04e9078c-d39d-4789-a8dd-b51e81fa8cd9'
WHERE id IN (
  '9fe3a073-7c87-4284-a2a5-8fd7b102293c',
  'ec294daf-9a53-4db9-9268-19acab82b5b8',
  '96b28e02-ace5-4da8-b485-8a4a02ed575c',
  '70455a3a-b4f0-430b-b73e-47de314944c9'
);
```

### Fix Part 2 — Improve Disambiguation Logic

In `useBillPOMatching.ts`, when multiple POs match the same vendor+project+cost_code, change the tiebreaker from "closest line amount" to prefer the PO where the bill fits within the remaining budget. This prevents a tiny PO from stealing matches from a large PO that the bill is actually a draw against.

**`src/hooks/useBillPOMatching.ts` (lines 207-220)**:
- For each candidate PO, check if the bill line amount fits within (PO amount - already billed). Prefer POs where it fits.
- Only fall back to amount proximity if multiple POs can accommodate the amount.

### Fix Part 3 — Add "Draw" Status Badge

Add a new `'draw'` status to indicate a bill is a partial draw on a PO (bill amount < PO amount, within budget).

**`src/hooks/useBillPOMatching.ts`**:
- In the `POMatch` interface, add `'draw'` to the status union type.
- When computing status per match: if `remaining >= 0` and `thisBillAmount < poAmount`, set status to `'draw'` instead of `'matched'`.
- Update the `BillPOMatchResult` overall_status logic to treat `'draw'` as a healthy state.

**`src/components/bills/POStatusBadge.tsx`**:
- Add a `'draw'` case: green badge with a different icon (e.g., `ArrowDownRight` or keep `Check`), label "Draw", tooltip "Partial draw — bill is a portion of the PO total."

**`src/components/bills/PODetailsDialog.tsx`**:
- The existing "Matched" badge logic already handles this correctly since it's based on remaining >= 0.

### Summary of Files Changed
| File | Change |
|---|---|
| `supabase/migrations/...` | Set `purchase_order_id` on 4 bill lines |
| `src/hooks/useBillPOMatching.ts` | Add `'draw'` status, fix disambiguation to prefer budget-fit over amount proximity |
| `src/components/bills/POStatusBadge.tsx` | Add `'draw'` badge variant |
| `src/hooks/usePendingBillPOStatus.ts` | Add `'draw'` to POStatus type if referenced |

