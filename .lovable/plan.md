Root cause: the email is sent by the Edge Function, but `sent_at` is currently written afterward by the browser in a background task. The create dialog immediately triggers a page reload, which can cancel that browser-side update. That is why the vendor receives the email but the database still shows `sent_at = null`, even after refresh.

Plan:
1. Move the source-of-truth `sent_at` update into `supabase/functions/send-po-email/index.ts`.
   - After the email send finishes successfully, update `project_purchase_orders.sent_at` inside the Edge Function using the same `purchaseOrderId`.
   - Only stamp `sent_at` when at least one email is actually sent.
   - Keep the existing email content/path unchanged.

2. Keep the existing client invalidation as a harmless UI refresh helper.
   - The browser can still invalidate/refetch the table after the send completes.
   - The browser should no longer be responsible for the permanent `sent_at` database write.

3. Correct the already-affected PO shown in the screenshot.
   - Set `sent_at` for PO `2026-228S-0003` using the Edge Function log send time (`2026-06-14T17:46:23Z`).

4. Verify with a database read.
   - Confirm PO `2026-228S-0003` has `sent_at` populated.
   - Confirm the future send path now writes `sent_at` server-side.