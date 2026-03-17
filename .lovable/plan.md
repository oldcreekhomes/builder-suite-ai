

## Filter Actual Costs by Lot ID

**Problem**: The Actual tab query fetches journal entry lines for all lots, causing duplicates when a transaction is split across multiple lots. Since the budget is lot-specific (`budgetItem.lot_id` exists), the query should filter by the budget item's lot.

### Changes

**File: `src/components/budget/BudgetDetailsModal.tsx`**

1. **Update the query key** (line 94) to include `budgetItem.lot_id`:
   ```typescript
   queryKey: ['budget-actual-costs', projectId, costCode.id, budgetItem.lot_id],
   ```

2. **Add a `lot_id` filter** to the Supabase query (after line 112). Build the query conditionally:
   ```typescript
   let query = supabase
     .from('journal_entry_lines')
     .select(`debit, credit, memo, journal_entries!inner(entry_date, description, reversed_by_id)`)
     .eq('account_id', settings.wip_account_id)
     .eq('project_id', projectId)
     .eq('cost_code_id', costCode.id)
     .eq('is_reversal', false)
     .is('journal_entries.reversed_by_id', null);

   if (budgetItem.lot_id) {
     query = query.eq('lot_id', budgetItem.lot_id);
   }

   const { data: lines } = await query;
   ```

This ensures that when viewing the budget for Lot 1, only actual costs allocated to Lot 1 are shown — matching the Job Costs report behavior. Single-file, ~5-line change.

