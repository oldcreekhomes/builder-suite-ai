

## Fix: "signal is aborted without reason" on budget import

**Problem**: Inserting 94 rows in a single Supabase `.insert()` call is hitting a request timeout or payload limit, causing the "signal is aborted without reason" error.

**Solution**: Batch the insert into chunks of 20 rows, inserting sequentially to avoid timeouts.

### Change — `src/components/budget/BudgetExcelImportDialog.tsx`

Replace the single `supabase.from('project_budgets').insert(inserts)` call (around line 285) with a chunked loop:

```typescript
// Batch insert in chunks of 20
const chunkSize = 20;
for (let i = 0; i < inserts.length; i += chunkSize) {
  const chunk = inserts.slice(i, i + chunkSize);
  const { error } = await supabase.from('project_budgets').insert(chunk);
  if (error) throw error;
}
```

This is the only change. No other files are modified.

