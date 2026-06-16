You're right — I misspoke. The actual buttons are "Send Purchase Order" (in the Create dialog) and "Send Purchase Order" (in the Actions menu of the PO list). Both should flip status to `approved`. Here's the fix:

## What's broken now

Three send paths exist. Only one sets status correctly:

1. **Create Purchase Order dialog → "Send Purchase Order" (new PO)** — `usePOMutations.createPOAndSendEmail` inserts with `status: 'approved'` ✅
2. **Create Purchase Order dialog → "Send Purchase Order" (editing an existing draft)** — `CreatePurchaseOrderDialog.tsx` line 609 stamps `sent_at` but never touches `status`. ❌
3. **PO list → Actions menu → "Send Purchase Order"** — opens `SendPOEmailModal`, which at line 76 stamps `sent_at` but never touches `status`. ❌

That's why PO 2026-1E-0002 is stuck on `status='draft'` despite being sent.

## Fix

1. **`src/components/purchaseOrders/SendPOEmailModal.tsx`** (line ~76) — change the update to also set `status: 'approved'` alongside `sent_at`.
2. **`src/components/CreatePurchaseOrderDialog.tsx`** (line ~609) — same change: include `status: 'approved'` in the update when sending an edited PO.
3. **`src/hooks/usePOMutations.ts`** (lines 165 and 335) — same change on the post-email `sent_at` stamps, so the field is guaranteed `approved` even if the original insert ever drifts.
4. **One-time DB backfill** — set `status='approved'` for every PO where `sent_at IS NOT NULL AND status='draft'` (fixes PO 2026-1E-0002 and any others in the same state).
5. **`src/hooks/useVendorPurchaseOrders.ts`** — leave the `.eq('status','approved')` filter as-is. Once the above is fixed, every sent PO is `approved`, so the bill PO dropdown will correctly show it. (No need to broaden the filter.)

## Out of scope (unchanged)

- "Save Draft" button — still saves as `draft` and does not send.
- "Send Test Email" — unchanged, doesn't affect status or `sent_at`.
- Cancel Purchase Order — unchanged.

Approve and I'll implement.
