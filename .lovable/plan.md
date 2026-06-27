## Change

Remove the **Auto-renew subscription** panel entirely from the Subscription tab. Subscriptions stay active by default; non-payment locks the account out — explicit cancel is redundant.

## Files

### `src/components/settings/SubscriptionTab.tsx`
- Delete the Auto-renew panel block (the `{details.subscription && (() => { ... })()}` toggle block inside the 2×2 grid).
- Grid becomes 3 panels: **Current Plan**, **Payment Method**, **Billing Information**. With `auto-rows-fr` removed (no longer needed for alignment) and a simple `grid-cols-1 lg:grid-cols-2 gap-3`, layout flows: row 1 = Current Plan + Payment Method, row 2 = Billing Information (left) and empty (right). Invoice History stays full-width below.
- Remove the `<Badge variant="destructive">Canceling</Badge>` next to the page title since users can no longer trigger cancellation.
- Remove the cancel/reactivate AlertDialog and related state (`cancelDialogOpen`, `handleCancel`, `handleReactivate`, `canceling`, `reactivating`) since the entry point is gone.

### Out of scope
- `cancel-subscription` and `reactivate-subscription` edge functions stay deployed (no code change, no removal) in case admin tooling needs them later.
- No changes to billing email logic, Stripe checkout, or payment method update.
- No DB changes.
