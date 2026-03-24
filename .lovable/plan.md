

## Fix: Reconciliation Missing Transactions — URL Length Overflow

### What's Happening

The reconciliation page for 103 E Oxford is showing only 1 transaction (a deposit) instead of many. Nothing was changed in the code — this is a **data scale issue**. As more bills and journal entries have been entered over time, the queries have crossed a critical threshold.

The console shows: `[Reconciliation] Journal lines query failed: {"message": "Bad Request"}`

### Root Cause

The reconciliation hook (`useBankReconciliation.ts`) fetches **all** bill payment journal entries (500+), collects their IDs, then passes them into a `.in('journal_entry_id', [...hundreds of UUIDs...])` filter. This creates a GET request URL that exceeds the HTTP URL length limit (~8KB), causing Supabase/PostgREST to return a 400 Bad Request.

When this query fails, the bill payment transactions silently return empty — and the same pattern affects manual journal entries. The result: only checks and deposits appear.

### Fix

**File: `src/hooks/useBankReconciliation.ts`** — Add a batched `.in()` helper and apply it to the two failing queries.

1. **Create a batch helper** (either inline or in `supabasePaginate.ts`) that splits large ID arrays into chunks of ~200 and runs parallel queries, then merges results:

```typescript
async function batchedIn<T>(
  buildQuery: (ids: string[]) => any,
  allIds: string[],
  batchSize = 200
): Promise<T[]> {
  if (allIds.length === 0) return [];
  const results: T[] = [];
  for (let i = 0; i < allIds.length; i += batchSize) {
    const chunk = allIds.slice(i, i + batchSize);
    const { data, error } = await buildQuery(chunk);
    if (error) throw error;
    if (data) results.push(...data);
  }
  return results;
}
```

2. **Apply to bill payment journal lines query** (~line 234): Replace the single `.in()` call with the batched version.

3. **Apply to manual journal lines query** (~line 564): Same fix for the manual journal entries query.

Both queries currently look like:
```typescript
const { data, error } = await supabase
  .from('journal_entry_lines')
  .select(...)
  .in('journal_entry_id', jeIds)  // jeIds can be 500+ UUIDs
  .eq('account_id', bankAccountId);
```

They will become:
```typescript
const journalLines = await batchedIn(
  (ids) => supabase
    .from('journal_entry_lines')
    .select(...)
    .in('journal_entry_id', ids)
    .eq('account_id', bankAccountId),
  jeIds
);
```

### Why This Wasn't Broken Before

The system worked fine when there were fewer bill payments. As data grew past ~300-400 journal entries, the URL exceeded the limit. No code change caused this — it's purely a function of data volume.

### Files Modified

- `src/hooks/useBankReconciliation.ts` — batch the two `.in()` queries that pass large ID arrays

