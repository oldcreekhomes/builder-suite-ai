# Add "Save Draft" to Create Purchase Order

Adds a third button between **Cancel** and **Create Purchase Order** that lets you save a partially-filled PO and return to it later without sending the vendor email.

## UI change

In `CreatePurchaseOrderDialog.tsx`, render three buttons in the footer:

```text
[ Cancel ]   [ Save Draft ]   [ Create Purchase Order ]
```

- "Save Draft" is only shown when creating a new PO (not when editing an already-sent PO, since those are locked).
- It's also shown when editing an existing draft (so you can keep saving without sending).
- Hidden in the bidding flow (that flow has its own send/confirm semantics).

## Behavior

**Save Draft click:**
1. Relaxed validation — only requires that *something* has been entered (at least a company OR one line item with any field filled). No requirement for a cost code or non-zero amount.
2. Inserts (or updates) `project_purchase_orders` with `status = 'draft'`, `sent_at = null`. Saves whatever line items, notes, custom message, and attachments exist.
3. **Does not** call the `send-po-email` Edge Function. Vendor receives nothing.
4. Closes dialog, refreshes the table, toast: "Draft saved".

**Reopening a draft:** Clicking the draft row in the Purchase Orders table opens the existing edit dialog pre-filled with all saved values. From there the user can either click **Save Draft** again to keep iterating, or **Create Purchase Order** to finalize — which flips `status` to `approved`, stamps `sent_at` server-side (existing Edge Function path), and sends the vendor email.

## Table display

The Purchase Orders table already shows all statuses. Drafts will render with:
- **Status** column: "Draft" (existing column already reads `po.status`).
- **Sent On** column: blank (correct — never sent).
- **PO #** column: blank until finalized (PO numbers are only assigned on send to avoid burning numbers on abandoned drafts).

No new tab/filter is added; the existing search already matches on status, so typing "draft" filters to drafts.

## Files touched

- `src/components/CreatePurchaseOrderDialog.tsx` — add Save Draft button, `handleSaveDraft` handler, relaxed validation path, conditional rendering rules.
- `src/hooks/usePOMutations.ts` — add a small `saveDraftPO` mutation (insert/update with `status='draft'`, no email, no PO number assignment).
- `src/components/purchaseOrders/PurchaseOrdersTableRow.tsx` — title-case "Draft" in the Status cell if it isn't already, and ensure clicking a draft row opens the edit dialog (it already does via `editOrder`).

No database migration needed — `project_purchase_orders.status` already defaults to `'draft'` and accepts text.
