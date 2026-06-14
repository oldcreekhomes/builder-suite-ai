# Persist Custom Message on PO drafts

The Custom Message field isn't saved anywhere — it's only used as the email body at send time, then discarded. For drafts (and edits in general), we need to persist it so it survives close-and-reopen.

## Database

Add a nullable `custom_message text` column to `public.project_purchase_orders` via migration.

## Code

**`src/components/CreatePurchaseOrderDialog.tsx`**
- `handleSaveDraft`: include `custom_message: customMessage.trim() || null` in both the insert and update payloads.
- `handleSubmit` (non-bid edit/create path): include the same field so it persists on full sends too.
- Pre-population effect: when opening an existing PO (`editOrder`), seed `setCustomMessage(editOrder.custom_message || "")` instead of forcing `""`.

No change to the Edge Function — it already receives `customMessage` from the dialog at send time.
