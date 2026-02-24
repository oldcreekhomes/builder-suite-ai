

## Simplified PO Matching: Suggest Once, Persist Forever

### The Simple Rule

PO suggestions happen at **two entry points only**: "Enter Manually" and "Enter with AI." After that, whatever is saved on the bill line (`purchase_order_id`) is the single source of truth -- no re-inference, no fallback guessing.

### Current Problems

1. **`useBillPOMatching.ts`** (used by Approved/Posted/Paid tabs) has a **fallback auto-match** (lines 91-206) that re-infers PO matches at display time using vendor + project + cost_code. This causes every bill with a matching cost code to show "Matched" even when no PO was ever assigned.

2. **`usePendingBillPOStatus.ts`** (used by Review tab) does the same inference for pending bills -- it never checks `purchase_order_id` on `pending_bill_lines`, it just guesses from cost codes.

3. These two hooks use **different logic**, so statuses can differ between tabs.

### The Fix (3 Changes)

#### 1. Remove all inference from `useBillPOMatching.ts`

- Delete lines 64-122 (the entire fallback auto-match block: `unmatchedCostCodeIds`, `fallbackPos`, `fallbackMap`, merging fallback POs)
- Delete lines 199-206 (the fallback resolution inside the per-line loop)
- Only explicit `purchase_order_id` values on `bill_lines` drive status
- Result: if `purchase_order_id` is NULL on a bill line, that line is "not matched" -- period

#### 2. Replace `usePendingBillPOStatus.ts` with explicit-only logic

- Instead of querying `project_purchase_orders` and inferring, simply read `purchase_order_id` from `pending_bill_lines`
- A pending bill line with `purchase_order_id` set = matched; without = not matched
- This means status in the Review tab matches exactly what was saved during the "Enter with AI" or "Enter Manually" step

#### 3. Keep the suggestion engine only in entry dialogs (no changes needed)

- **`EditExtractedBillDialog.tsx`** (AI entry): Already auto-matches using the smart scoring engine and persists `purchase_order_id` to `pending_bill_lines` (lines 470-485). This is correct -- it suggests at entry time and saves.
- **`ManualBillEntry.tsx`** (Manual entry): Already uses `getBestPOLineMatch` and saves `purchase_order_id` on bill lines at submission. This is correct.
- **No changes needed** to these entry points -- they already suggest and persist.

### What This Achieves

- **Enter Manually / Enter with AI**: System suggests PO matches and saves them to the database
- **Review tab**: Shows exactly what was saved -- no guessing
- **Approved / Posted / Paid tabs**: Shows exactly what was saved -- no guessing
- **User edits a PO in any tab**: The edit saves `purchase_order_id` to the database, overriding the original suggestion
- **Same status everywhere**: Because every tab reads the same column (`purchase_order_id`) from the database

### What Happens to Existing Bills

Bills that currently show "Matched" due to inference (like the Ocean Watch / ABC Supply ones) will correctly flip to **"No PO"** because they have `purchase_order_id = NULL` in the database. This is the correct behavior -- they were never actually linked.

### Files Modified

| File | Change |
|------|--------|
| `src/hooks/useBillPOMatching.ts` | Remove fallback inference block; only use explicit `purchase_order_id` |
| `src/hooks/usePendingBillPOStatus.ts` | Rewrite to check `purchase_order_id` on `pending_bill_lines` instead of inferring from cost codes |

### Files NOT Modified (already correct)

| File | Why |
|------|-----|
| `src/components/bills/EditExtractedBillDialog.tsx` | Already suggests and persists PO at AI entry time |
| `src/components/bills/ManualBillEntry.tsx` | Already suggests and persists PO at manual entry time |
| `src/hooks/usePendingBills.ts` | `autoPopulatePOIds` helper can be removed since we no longer need last-minute inference at approval time |

