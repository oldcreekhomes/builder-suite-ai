
## Fix: Framing Labor Showing Incorrectly in PO Status Summary for INV0022

### Root Cause (Two-Part Problem)

**Part 1 — Stale database data**: The two Exterior Trim/Cornice bill lines ($400 each) on INV0022 still have `purchase_order_id = 1442c768...` (the Framing Labor PO) stored in the database. This was written by the original auto-match and never cleared because the previous `sanitizePoId` bug silently ignored "No purchase order" saves. The fix (returning `null`) is now in place, but the bad data is already persisted.

**Part 2 — Auto-matching in display hook**: Even if the stale data were cleared (making those lines `null`), the `useBillPOMatching` hook would still try to auto-match those lines by cost code. Since the Exterior Trim cost code (4400) does not have a matching PO, it wouldn't re-match in this case — but this is a fragile assumption. Any line with `null` purchase_order_id is treated as "not yet assigned" and goes through cost-code auto-matching, making it impossible to tell "user chose No PO" from "user hasn't assigned yet."

### What Will Change

**Fix 1 — Database migration to clear stale data:**

Create a migration that clears `purchase_order_id` and `purchase_order_line_id` from the two specific Exterior Trim bill lines on INV0022:

```sql
-- Clear stale Framing Labor PO assignment from INV0022 Exterior Trim lines
UPDATE bill_lines
SET purchase_order_id = NULL,
    purchase_order_line_id = NULL
WHERE id IN (
  'aab164cf-a400-4c2b-ab68-5f8aac695a0f',
  '2ad7293e-8b20-406c-a26c-a0a7a047eec5'
);
```

After this runs, the two Exterior Trim lines will have `null` PO IDs and will correctly show as "No PO."

**Fix 2 — Remove cost-code auto-matching from `useBillPOMatching`:**

The PO Status Summary and the status badge in the table should only reflect **explicitly saved PO assignments** (`purchase_order_id IS NOT NULL` in the database). It should not try to infer matches from cost codes at display time — that inference belongs only in the edit dialogs.

The change removes the "Priority 2" auto-match path entirely from the `allLines.forEach` loop:

```
Before:
  if (purchase_order_id && not sentinel) → use explicit PO
  else if (cost_code_id) → auto-match by vendor+project+cost_code key

After:
  if (purchase_order_id && not sentinel) → use explicit PO
  else → skip (line has no PO)
```

This means:
- Lines with an explicit `purchase_order_id` → appear in summary ✅  
- Lines with `null` (No PO, or never assigned) → do not appear in summary ✅  
- No more phantom PO matches from unrelated cost codes ✅

### Files Changing

| File | Change |
|------|--------|
| `supabase/migrations/TIMESTAMP_fix_inv0022_stale_po.sql` | New migration clearing stale PO IDs from 2 bill lines |
| `src/hooks/useBillPOMatching.ts` | Remove cost-code auto-match fallback from `allLines.forEach` loop |

### Result for INV0022 After Fix

| Line | Amount | PO Status |
|------|--------|-----------|
| Siding labor balance | $10,268 | Matched → 2025-115E-0003 (Siding) |
| EXT - Paper re installation | $500 | No PO |
| EXT - PVC around bottom labor | $400 | No PO |
| EXT - Rip backing behind 1x4 trim | $400 | No PO |

The PO Status Summary will show only the Siding PO (2025-115E-0003), and the overall status badge on the row will show "Matched" (since one line is matched). The "Framing Labor" PO will no longer appear.
