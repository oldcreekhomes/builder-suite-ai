## Goal
Make the "Sent On" column populate immediately after a PO is created from the Create Purchase Order dialog (without requiring a page refresh).

## Root cause
In `src/hooks/usePOMutations.ts`, `createPOAndSendEmail` does:

1. Insert the PO row
2. Insert PO lines
3. Return success → `onSuccess` invalidates `purchase-orders` query
4. **In the background (fire-and-forget):** invoke `send-po-email`, then `UPDATE project_purchase_orders SET sent_at = now()`

Step 3 fires the table refetch **before** step 4 writes `sent_at`, so the UI re-reads the row while `sent_at` is still `NULL`. The email is sent fine (user confirmed receipt), but the column stays "Not sent" until the page is reloaded.

The bidding flow has the same code path, but in that flow the user navigates away from the bid package after closing it, so the staleness isn't visible. From the standalone dialog you land directly on the table that needs the fresh value.

## Fix
In `src/hooks/usePOMutations.ts`, inside the background IIFE in `createPOAndSendEmail` (and the matching block in `resendPOEmail`), after the successful `sent_at` update, invalidate the purchase-orders queries again so the table re-fetches and shows the new value:

```ts
queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
```

This is a one-line follow-up invalidation after the `sent_at` write succeeds. No DB changes, no edge function changes, no behavior change for the bidding flow other than a redundant (cheap) refetch when the background email finishes.

## Verification
1. Open Create Purchase Order dialog, fill it out, submit.
2. Table immediately shows the new PO with "Not sent".
3. Within a couple seconds (once the background `send-po-email` resolves and `sent_at` is written), the row auto-updates to show today's date in the "Sent On" column — no manual refresh required.