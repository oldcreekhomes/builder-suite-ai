## Fix Edit Extracted Bill: interleave by original line + restore Cost Code/Account/Project names on split rows

Two issues with the current multi-lot auto-split:

1. **Ordering is wrong** — rows are grouped by lot (all of Lot 1, then all of Lot 2, …). You want them to follow the invoice top-to-bottom: for each original invoice line, show one row per lot, then move to the next original line:
   ```
   Line A → Lot 1
   Line A → Lot 2
   ...
   Line A → Lot 19
   Line B → Lot 1
   Line B → Lot 2
   ...
   ```
2. **Cost Code tooltip shows "No Cost Code"** for split rows. The Address tooltip uses `cost_code_id` joins so it's fine, but Edit Extracted Bill reads the denormalized `cost_code_name` / `account_name` / `project_name` columns. Today the split insert payload omits those, so every newly-inserted split row has them as NULL.

### Fix

**File:** `supabase/functions/split-pending-bill-lines/index.ts`

1. Swap the loop nesting so the OUTER loop iterates `originalIdx` (each invoice line) and the INNER loop iterates `lotIdx` (each lot). New `line_number` formula:
   ```
   newLineNumber = base + originalIdx * lotCount + lotIdx + 1
   ```
   `usePendingBills` and `EditExtractedBillDialog` already sort by `line_number`, so the UI flips automatically.

2. In the `inserts.push({...})` payload for lots 2..N, add three fields copied from the original line:
   - `cost_code_name: line.cost_code_name`
   - `account_name: line.account_name`
   - `project_name: line.project_name`

   The Lot 1 row is updated in place and already has these names.

No schema, RLS, client, or math changes. Per-lot amounts, cent-precise remainders, totals, and the Address tooltip are all unchanged.

### Verification

1. Re-process the `Gray_Invoice_12429` PDF on the 19-lot project via Enter with AI.
2. Open Edit Extracted Bill: rows should read Line A (Lots 1→19), then Line B (Lots 1→19), etc., matching the invoice top-down.
3. Hover Cost Code on the Manage Bills row → tooltip lists real cost code names (no "No Cost Code") with a per-line total equal to the row amount.
4. Address tooltip is unchanged — Lot 1..19 with $73.79 each (Lot 19 = $74.28), Total $1,402.50.
5. Approve the bill — totals and per-lot allocations are identical to before.