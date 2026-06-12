## Problem

In Reconcile Accounts, the allocation tooltip lists lots as `1:` and `2:` instead of `Lot 1:` and `Lot 2:` (see screenshot). Other places in the app (e.g. the Address dropdown on Write Checks Job Cost rows) display lots as `Lot 1`, `Lot 2`.

## Cause

`src/components/transactions/ReconcileAccountsContent.tsx` (line 111) renders the tooltip row as:

```tsx
<span className="text-muted-foreground">{lot.name}:</span>
```

`lot.name` comes from `project_lots.lot_number`, which is the bare number ("1", "2"). There is no "Lot " prefix.

## Fix (UI only)

In `src/components/transactions/ReconcileAccountsContent.tsx`, change the lot label render so:

- If `lot.name === 'No Lot'`, show `No Lot:` (unchanged).
- Otherwise show `Lot {lot.name}:` → e.g. `Lot 1:`, `Lot 2:`.

Single-line change at line 111, no data or hook changes.

## Out of scope

No other tooltips, no DB changes, no changes to `useBankReconciliation`, no changes to the "Total:" row.
