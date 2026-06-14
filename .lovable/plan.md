# Stop hard-reloading after Save / Save Draft

The blank-screen flash is `window.location.reload()` firing in `PurchaseOrdersTable.tsx`'s `onSuccess`. Replace it with a React Query cache invalidation so the table re-fetches in place — no page reload, no blank screen.

## Change

**`src/components/purchaseOrders/PurchaseOrdersTable.tsx`**
- Import `useQueryClient` from `@tanstack/react-query`.
- In `onSuccess` of `<CreatePurchaseOrderDialog>`, replace `window.location.reload()` with:
  ```ts
  queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
  ```
  This matches the existing query key used by `usePurchaseOrders` and the other mutations in `usePurchaseOrderMutations`, so the table refreshes instantly using cached app shell.

No other call sites need changes — Save Draft, Create, and Edit all funnel through the same `onSuccess`.
