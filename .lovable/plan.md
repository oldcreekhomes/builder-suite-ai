## Goal

Once a PO has been sent to the vendor, treat it as a binding contract. Allow only **internal** corrections (cost code, description, notes, attachments) and **never silently re-email** the vendor for those.

## Scope of changes

All edits happen in `src/components/CreatePurchaseOrderDialog.tsx`. Vendor email behavior is centralized in the same `handleSubmit` flow. No DB schema changes. No edge function changes.

## Behavior changes when editing an existing PO

A PO is considered **locked** when `editOrder.sent_at` is set (i.e., it has been sent to the vendor). Since new POs are auto-`approved` and immediately emailed on create, in practice every editable PO past first save will be locked — which matches your intent.

### 1. Field-level locking on existing line items
For each existing line on a sent PO:
- **Qty** input → render as `disabled` (read-only), styled like the Amount cell (right-aligned, plain text). Tooltip on hover: *"Locked — PO already sent to vendor"*.
- **Unit Cost** input → same treatment.
- **Cost Code** picker → remains editable.
- **Description** input → remains editable.
- **Extra checkbox** → remains editable.
- **Delete (trash) button** → disabled for existing lines on a sent PO (deleting a line would change the contract amount).

### 2. Add Line button
- Disabled on a sent PO (per your direction). Tooltip: *"PO already sent — create a new PO for additional work."*

### 3. Company field
- Disabled on a sent PO (changing the vendor on a sent contract is not valid).

### 4. Vendor email logic
Today, every edit calls `sendPOEmail(..., isUpdate=true)` and refreshes `sent_at`. New behavior:

- Compute a **vendor-visible diff** between `editOrder` snapshot and the form state. The vendor sees:
  - Company
  - Per-line: Qty, Unit Cost, Amount, Extra flag, line count (add/remove)
  - Total amount
- Compute an **internal-only diff** for:
  - Per-line: cost_code_id, description
  - Notes
  - Attachments
  - Custom message

- If only internal-only fields changed → **save silently**, do NOT call `send-po-email`, do NOT touch `sent_at`. Toast: *"Purchase order updated (vendor not notified — internal change only)."*
- If any vendor-visible field changed → keep current behavior: send updated PO email and refresh `sent_at`.
- Since Qty/Unit Cost/Company/Add Line are now locked on sent POs, in practice this means edits to a sent PO will almost always be silent. The diff check is the safety net.

### 5. New (unsent) POs
- No locking. Full editing as today. First save still triggers the initial vendor email + `sent_at` stamp.

## Implementation outline

In `CreatePurchaseOrderDialog.tsx`:

1. Derive `const isLocked = !!editOrder?.sent_at;` near the top of the component (after `editOrder` is in scope).
2. Track which line indexes were "original" vs "newly added" using the initial `existingLines` count, so we know which rows to lock. (With Add Line disabled this collapses to "all rows are original" but we keep the structure for clarity and future-proofing.)
3. In the line-item table render (around lines 619–636):
   - When `isLocked && isOriginalLine(idx)`, replace the Qty `<Input>` with a right-aligned read-only cell (mirrors the Amount cell styling) wrapped in a Tooltip explaining the lock.
   - Same for Unit Cost.
   - Disable the Trash button for those rows.
4. Disable `CompanySearchInput` and the "Add Line" button when `isLocked`.
5. In `handleSubmit` (around line 320), before deciding whether to call `sendPOEmail`:
   - Build `originalLines` from `existingLines` (already loaded by `usePurchaseOrderLines`).
   - Compute `vendorVisibleChanged` by comparing: `selectedCompany.id` vs `editOrder.company_id`; line count; and for each matched line (by `line_number` or stable index): `quantity`, `unit_cost`, `amount`, `extra`.
   - Pass a new `skipEmail` flag (or just branch) so `sendPOEmail` is not invoked when `!vendorVisibleChanged`. Also do not run the `update sent_at` block in that branch.
6. Adjust toasts so the user sees clearly whether the vendor was notified.

## Out of scope / not changing

- The PDF generator and email template content.
- The `purchase_order_lines` table schema.
- PO creation flow (still sends the initial email and stamps `sent_at`).
- Bills / matching logic.
- "Approved" status anywhere — confirmed with you that `sent_at` is the canonical signal post-bidding-redesign; the legacy `status='approved'` column is left untouched and not used as the lock trigger.

## Answer to your second question (recap)

Yes — today every PO update silently re-emails the vendor (line 337 → `sendPOEmail(..., true)` → edge function `send-po-email` with `isUpdate: true` → `sent_at` refreshed). After this change, **internal cost-code/description-only edits will no longer email the vendor**. Only changes that actually affect the contract (qty, unit cost, company, line additions/removals) will resend — and with the new locks, those will only be possible on POs that haven't been sent yet.