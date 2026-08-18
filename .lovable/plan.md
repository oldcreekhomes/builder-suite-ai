# Purchase Orders: track original send vs. resends

## What's happening now

The PO `2026-100N-0049` on Nob Hill was in fact resent — its `sent_at` value is now
2026-08-18 20:52 UTC. The Jul 7 date in the screenshot is a stale table render; the list
didn't refetch after the send completed.

Two real problems remain:

1. Every resend **overwrites** the original send date. There's no record that the PO first
   went out on Jul 7 and was resent on Aug 18.
2. The Purchase Orders table doesn't reliably refresh right after a send, so the user sees
   the old date and assumes the send failed.

## Proposed behavior

Keep "Sent On" meaning the **first** time the PO went to the vendor, and surface resends
alongside it:

```text
Sent On
Jul 7, 2026
Resent Aug 18, 2026 (2x)   <- small muted second line, tooltip lists each send timestamp
```

- First successful send sets both the original date and the last-sent date.
- Each later send only updates the last-sent date and increments a send counter.
- If a PO has only ever been sent once, the row looks exactly as it does today (no second line).
- Same treatment applies whether the send comes from the PO list, the Create/Edit PO dialog,
  or the Send PO Email modal.

## Technical notes

- Add `first_sent_at` (timestamptz) and `send_count` (int, default 0) to
  `project_purchase_orders`; keep existing `sent_at` as "last sent". Backfill
  `first_sent_at = sent_at` and `send_count = 1` for every PO that already has a `sent_at`.
- Stamp centrally in `supabase/functions/send-po-email/index.ts` where `sent_at` is written
  today: set `first_sent_at` only when null, always bump `sent_at` and `send_count`.
- Remove/neutralize the duplicate client-side `sent_at` stamps in
  `src/components/purchaseOrders/SendPOEmailModal.tsx`, `src/hooks/usePOMutations.ts`, and
  `src/components/CreatePurchaseOrderDialog.tsx` so the edge function stays the single source
  of truth (they currently race it).
- Render in `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx`:
  primary line = `first_sent_at`, muted second line + tooltip when `send_count > 1`.
- Invalidate the purchase-orders query after the send promise resolves so the date updates
  without a manual refresh.
