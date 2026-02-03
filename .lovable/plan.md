
# Fix: Undo Reconciliation Failing Due to Missing Bill Payments Cleanup

## Root Cause

**This is NOT an RLS policy issue.** The actual error from the database is:

```
update or delete on table "bank_reconciliations" violates foreign key constraint 
"bill_payments_reconciliation_id_fkey" on table "bill_payments"
```

The `undoReconciliation` function in `useBankReconciliation.ts` clears the `reconciliation_id` from four tables before deleting the reconciliation record:
1. checks
2. deposits  
3. bills
4. journal_entry_lines

However, the `bill_payments` table also has a `reconciliation_id` column with a foreign key constraint to `bank_reconciliations`. When bill payments are marked as reconciled, they get linked to the reconciliation record. The undo function is not clearing this link before attempting to delete, causing the foreign key constraint violation.

---

## Solution

Add a step to clear `bill_payments` before deleting the reconciliation record.

---

## File to Modify

| File | Change |
|------|--------|
| `src/hooks/useBankReconciliation.ts` | Add step 4.5 to clear bill_payments reconciliation data |

---

## Technical Change

**Location:** Lines 1397-1399 (after journal_entry_lines update, before delete)

**Add new step:**

```typescript
// 4. Update journal_entry_lines: same pattern for manual journal entries
const { error: jelError } = await supabase
  .from('journal_entry_lines')
  .update({ 
    reconciled: false, 
    reconciliation_id: null, 
    reconciliation_date: null 
  })
  .eq('reconciliation_id', reconciliationId);

if (jelError) throw jelError;

// 5. NEW: Update bill_payments: same pattern
const { error: billPaymentsError } = await supabase
  .from('bill_payments')
  .update({ 
    reconciled: false, 
    reconciliation_id: null, 
    reconciliation_date: null 
  })
  .eq('reconciliation_id', reconciliationId);

if (billPaymentsError) throw billPaymentsError;

// 6. Delete the reconciliation record (was step 5)
const { error: deleteError } = await supabase
  .from('bank_reconciliations')
  .delete()
  .eq('id', reconciliationId);
```

---

## Why This Will Fix Joanne's Issue

1. Joanne has the correct permission (`can_undo_reconciliation: true`)
2. Her role as `accountant` gives her proper RLS access to all these tables
3. The only issue was the missing `bill_payments` cleanup step
4. Once we add this step, the foreign key constraint will be satisfied and the delete will succeed

---

## Result After Fix

| Before | After |
|--------|-------|
| FK constraint error when bill_payments exist | All linked records properly cleared before delete |
| "Failed to undo reconciliation" error | Successful undo with confirmation toast |
