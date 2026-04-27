# Fix slow PO send/update (10s freeze)

## Root cause

When a user creates, updates, or sends a Purchase Order, the UI awaits the `send-po-email` edge function before closing the dialog and refreshing. That edge function fetches PO/project/cost-code/manager data, then calls Resend to send 1+ emails, which typically takes 8–12 seconds. Nothing about that work needs to block the user — the PO row is already saved before the email send starts.

## Fix

Convert the email send into a fire-and-forget background call in the three places it's awaited from the UI:

1. **`src/components/CreatePurchaseOrderDialog.tsx`** — `sendPOEmail()` is `await`ed in both the create and update branches of `handleSubmit`. Stop awaiting it. Kick off the email in the background, immediately show a "Purchase order created/updated — sending email…" toast, close the dialog, and let `onSuccess()` refresh the table. The existing inner try/catch in `sendPOEmail` already shows a follow-up success/warning toast when the send completes, so the user still gets confirmation.

2. **`src/components/purchaseOrders/SendPOEmailModal.tsx`** — `handleSend` awaits the invoke and the subsequent `sent_at` stamp. Keep the pre-check for representatives (fast), then fire the invoke + stamp in the background, close the modal immediately, and toast a follow-up on completion/failure.

3. **`src/hooks/usePOMutations.ts`** (lines 145 and 298) — same pattern: don't await the `send-po-email` invoke inside the mutation. Return success as soon as the DB write completes; let the email run in the background and toast its result.

## Notes

- No edge function changes needed — the slowness is purely the awaited round-trip.
- The PO record, lines, and `sent_at` stamping logic are preserved; only the awaiting changes.
- Errors during the background email still surface via toast, just a few seconds later instead of blocking the UI.

## Files modified

- `src/components/CreatePurchaseOrderDialog.tsx`
- `src/components/purchaseOrders/SendPOEmailModal.tsx`
- `src/hooks/usePOMutations.ts`
