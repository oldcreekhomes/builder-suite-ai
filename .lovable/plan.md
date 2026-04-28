# Fix React error #310 on Review tab (Manage Bills)

## Root cause

In `src/components/bills/BillsApprovalTable.tsx`, the recently-added batch payment logic introduced a `useMemo` call at **line 880** — but the component performs an early `return` for the loading state at **line 866**:

```tsx
if (isLoading) {
  return <div className="p-8 text-center">Loading bills...</div>;
}

// ...

const selectedBillsForBatch = useMemo(   // ← hook called conditionally
  () => filteredBills.filter(b => selectedBillIds.has(b.id)),
  [filteredBills, selectedBillIds]
);
```

On first render `isLoading` is `true`, React records 0 hooks past that line. When data arrives and `isLoading` flips to `false`, the `useMemo` runs — React sees a different hook count → **Minified React error #310** ("Rendered more hooks than during the previous render").

This explains the session replay flow:
1. Tab loads → "Loading bills..." renders (early return path).
2. Bills query resolves → component re-renders with new hook present → crash → ErrorBoundary shows "Something went wrong".

## Fix

Move the batch-payment derived state (`selectedBillsForBatch`, `selectedVendorName`, `selectedTotal`, `hasOnlyCredits`, plus the colSpan computation) **above** the `if (isLoading)` early return, so all hooks run unconditionally on every render.

Specifically in `src/components/bills/BillsApprovalTable.tsx`:
- Relocate the `useMemo` for `selectedBillsForBatch` and the plain-derived constants from lines 877–~900 to a position before line 866.
- Keep the `if (isLoading) return …` guard, but it must come *after* every hook call.
- Verify no other hooks (`useMemo`, `useCallback`, `useEffect`) sit below the early return; if any do, hoist them too.

## Files to modify

- `src/components/bills/BillsApprovalTable.tsx`

## Verification

After the fix, opening the Review tab on Oceanwatch Court should:
- Show "Loading bills..." briefly, then render the table without throwing.
- No React #310 in the console.
- Batch payment toolbar still works on the Approved tab.

Reply **approve** to apply the fix.
