

## Fix: Partial Bill Payments Showing as Single Entry in Reconciliation

### Problem
When a bill has multiple partial payments (e.g., $300 on 2/23 and $1,012.57 on 3/18), the reconciliation view aggregates them into **one row** showing the total ($1,312.57) with only the latest date (3/18). This makes it impossible to reconcile the February statement because the $300 payment doesn't appear as a separate line.

### Root Cause
In `useBankReconciliation.ts` (lines 318-361), the code groups journal entries by `bill.id` (source_id):

```js
// Aggregates ALL payments for the same bill into one total
billToTotalCredit.set(je.source_id, existingTotal + jeCredit);
// Keeps only the LATEST date
billToLatestDate.set(je.source_id, je.entry_date);
```

This means 2 separate journal entries (partial payments) for the same bill get merged into 1 reconciliation row.

### Fix
Instead of grouping by bill ID, create **one reconciliation transaction per journal entry**. Each journal entry represents a distinct payment event with its own date and amount — exactly what the bank statement shows.

**File: `src/hooks/useBankReconciliation.ts`**

1. **Replace the bill-grouped aggregation** (lines 318-361) with a per-journal-entry approach:
   - Iterate over `journalEntries` that have credits to the bank account
   - For each journal entry, look up the bill it belongs to (via `source_id`)
   - Create one `ReconciliationTransaction` per journal entry, using:
     - `id`: the journal entry ID (not the bill ID) — so each payment can be independently checked/reconciled
     - `date`: the journal entry's `entry_date` (the actual payment date)
     - `amount`: the credit from that specific journal entry
     - `payee`: vendor name from the bill

2. **Update the reconciliation marking logic** for `bill_payment` type (lines 1134-1143):
   - Currently updates the `bills` table by `id` — but now the `id` will be a journal entry ID
   - Change to update `journal_entry_lines` with reconciliation metadata (matching the `journal_entry` type pattern), since each partial payment's journal entry line is the actual unit being reconciled
   - Also need to add a new type like `'bill_payment_je'` or reuse the existing logic by storing the journal_entry_line_id

3. **Exclude bill IDs already handled by consolidated payments** — the existing `billIdsInConsolidatedPayments` exclusion filter (line 404) needs to apply against the bill IDs linked to journal entries, not the transaction IDs themselves.

4. **Update the undo reconciliation logic** to clear reconciliation data from journal_entry_lines for these per-JE bill payment rows (around line 1440+).

### Key consideration
The `markTransactionReconciled` mutation for `bill_payment` currently writes to the `bills` table. With per-JE rows, we need to track reconciliation at the journal entry line level instead. This aligns with how `journal_entry` type already works and is more accurate — each payment event is independently reconcilable.

### Implementation detail
- Use `journal_entry_line_id` as the transaction ID (fetch it alongside journal_entry_id and credit)
- Set `type: 'bill_payment'` still for display purposes
- Mark reconciliation on `journal_entry_lines` table (same as manual JE type)
- The bill's own `reconciled` flag becomes irrelevant for partial payments — what matters is each payment's JE line being reconciled

### Files Changed
- `src/hooks/useBankReconciliation.ts` — per-journal-entry bill payment rows + updated reconciliation marking

