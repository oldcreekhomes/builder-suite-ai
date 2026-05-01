# Why a refresh was needed

You weren't imagining it — this is a real bug, not a one-time glitch. The single-bill payment path forgets to refresh the new unified table.

## Root cause

Since we consolidated Approved/Paid into the unified `BillsApprovalTable`, that table reads from React Query key **`bills-for-approval-v3`**.

In `src/hooks/useBills.ts`:

- **`payMultipleBills.onSuccess`** (batch pay) correctly invalidates `bills-for-approval-v3` → batch payments refresh instantly. ✅
- **`payBill.onSuccess`** (single pay, line 875–884) invalidates `bills`, `bills-for-payment`, `bill-approval-counts`, `balance-sheet` — but **NOT** `bills-for-approval-v3`. ❌

So after a single Pay Bill, the bill's status updates in the DB, but the table keeps showing the cached "Approved" snapshot until you manually refresh (which forces a refetch).

## Fix

Add the missing invalidations to `payBill.onSuccess` so it matches `payMultipleBills`:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['bills'] });
  queryClient.invalidateQueries({ queryKey: ['bills-for-approval-v3'] }); // NEW
  queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
  queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
  queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
  queryClient.invalidateQueries({ queryKey: ['bill-payments-reconciliation'] }); // NEW (parity with batch)
  queryClient.invalidateQueries({ queryKey: ['account-transactions'] });        // NEW (parity with batch)
  toast({ title: "Success", description: "Bill payment recorded and posted to General Ledger" });
}
```

## Files

- `src/hooks/useBills.ts` — extend `payBill.onSuccess` invalidations (single-line additions)

## Result

After approval, paying a single bill will immediately move it from the Approved tab to the Paid tab, update the tab counts, and refresh the bank register — no manual refresh required. So no, you should not have to refresh next time.

Reply **approve** to apply.