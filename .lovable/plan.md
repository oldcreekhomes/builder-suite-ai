## Plan

### Goal
When a user manually creates a PO from the Create Purchase Order dialog (non-bid flow) and clicks "Create Purchase Order", send the exact same vendor email that the bidding flow sends when closing out a bid package.

### What's happening today
Both flows already invoke the same Edge Function (`send-po-email`), but the standalone dialog uses an inline `sendPOEmail` helper in `CreatePurchaseOrderDialog.tsx` that:

- Passes `isUpdate: false` and a manually-built `lineItems` array — the bidding flow does not. The Edge Function uses `isUpdate` to change the subject line to `UPDATED - …` (harmless when false) and pulls line items from the DB when `lineItems` is omitted (which is the bidding behavior).
- Is fire-and-forget but lives in dialog code instead of the shared `usePOMutations` hook, so error handling, toasts, and `sent_at` updates can drift from the bidding path.

The most reliable way to keep them identical going forward is to route the standalone "create new PO" through the same `usePOMutations.createPOAndSendEmail` mutation the bidding flow uses.

### Changes (single file: `src/components/CreatePurchaseOrderDialog.tsx`)

1. In the non-bid, non-edit branch of `handleSubmit` (the standalone "create new PO" path), replace the inline `supabase.from('project_purchase_orders').insert(...)` + `savePOLines` + `sendPOEmail` with a single call to `createPOAndSendEmail.mutateAsync({...})` from the existing `usePOMutations(projectId)` hook. Pass:
   - `companyId: selectedCompany.id`
   - `costCodeId: validLines[0].cost_code_id`
   - `totalAmount`
   - `biddingCompany`: a minimal synthesized shape `{ companies: { id, company_name }, proposals: [] }` so the shared mutation can read the company name for the email
   - `customMessage`
   - `lineItems: validLines`
   - `files: uploadedFiles`
   - (no `bidPackageId` / `bidId`)
   
2. Leave the **edit** branch untouched — it still needs `isUpdate: true` and the vendor-visible-change detection, which is specific to edits.

3. Remove the now-unused local `sendPOEmail` helper if nothing else references it. (`savePOLines` is still used by the edit branch, so keep it.)

### Why this works
`createPOAndSendEmail` already:
- Inserts the PO row with `status: 'approved'`
- Persists `purchase_order_lines`
- Fires `send-po-email` with the bidding-flow body (no `isUpdate`, no `lineItems` — Edge Function pulls lines from DB)
- Updates `sent_at` on success and surfaces toasts

So the vendor email rendered for a manually-created PO will be byte-identical to the bidding flow's email.

### Verification
After implementing, manually create a PO from the dialog; the row's "Sent On" column should populate with the current date and the vendor should receive the standard PO email (same subject, body, line-items table, and footer as the bidding flow).