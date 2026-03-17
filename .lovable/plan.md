

## Fix Actual Tab to Show Real Costs from Journal Entries

**Problem**: The Actual tab currently shows `budgetItem.actual_amount` (a static field on `project_budgets`), which is $0. The real actual costs come from **journal entry lines against the WIP account** — the same source the Job Costs report uses. Those costs exist but aren't being queried.

**Solution**: Add a query to the BudgetDetailsModal that fetches actual costs from `journal_entry_lines` (matching the Job Costs report logic), filtered by this budget item's cost code.

### Changes

**File: `src/components/budget/BudgetDetailsModal.tsx`**

1. **Add a `useQuery` hook** inside the modal that:
   - Fetches the WIP account ID from `accounting_settings`
   - Queries `journal_entry_lines` where `account_id = wipAccountId`, `project_id = projectId`, `cost_code_id = costCode.id`, `is_reversal = false`, and `journal_entries.reversed_by_id IS NULL`
   - Sums `debit - credit` to get the actual cost total
   - Also returns the individual line items (with date, memo, debit, credit) for display

2. **Update the Actual tab content** to:
   - Show a table of individual journal entry transactions (Date, Description/Memo, Amount) instead of a single row
   - Show "No costs to date" if no journal lines exist
   - Show the summed total at the bottom

3. **Query shape** (mirrors Job Costs logic):
```typescript
const { data: actualCostData } = useQuery({
  queryKey: ['budget-actual-costs', projectId, costCode.id],
  queryFn: async () => {
    const { data: settings } = await supabase
      .from('accounting_settings')
      .select('wip_account_id')
      .single();
    
    if (!settings?.wip_account_id) return { lines: [], total: 0 };
    
    const { data: lines } = await supabase
      .from('journal_entry_lines')
      .select(`
        debit, credit, memo,
        journal_entries!inner(entry_date, description, reversed_by_id)
      `)
      .eq('account_id', settings.wip_account_id)
      .eq('project_id', projectId)
      .eq('cost_code_id', costCode.id)
      .eq('is_reversal', false)
      .is('journal_entries.reversed_by_id', null);
    
    const total = (lines || []).reduce((sum, l) => sum + ((l.debit || 0) - (l.credit || 0)), 0);
    return { lines: lines || [], total };
  },
});
```

4. **Table columns**: Date, Description, Amount — sorted by date. This gives the user a detailed breakdown matching what Job Costs shows.

Single file change to `BudgetDetailsModal.tsx`.

