
## Goal
Stop maintaining two parallel UIs. Make the bidding "Confirm PO" flow render the same `CreatePurchaseOrderDialog` that the Purchase Orders page uses, so any future UI improvement happens in one place.

## Why we have two today
Both dialogs do essentially the same thing — collect company + line items + custom message + attachments and create a PO with email — but they evolved in different folders:

- `src/components/CreatePurchaseOrderDialog.tsx` (504 lines) — used from the Purchase Orders page. Clean, shadcn defaults, Company search + Notes + Line Items table + Custom Message + Attachments dropzone. Writes directly to `project_purchase_orders` + `purchase_order_lines` and calls the `send-po-email` edge function.
- `src/components/bidding/ConfirmPODialog.tsx` (498 lines) — used from `BiddingTableRow` and `BiddingCompanyRow` after a bid is accepted. Same fields plus: pre-filled company (locked), AI-extracted line items, "Sending To" recipients preview, a Proposal column with file preview/delete, an "isExtracting" sparkles loading state, and a `mode='resend'` variant. Uses `usePOMutations` (`createPOSendEmailAndUpdateStatus` / `resendPOEmail`) which also flips the bidding company status and closes the bid package.

The visual divergence (locked company text vs search input, different column set, different button colors, etc.) is purely cosmetic — the data model and final actions are nearly identical.

## Approach: one dialog, two entry modes

Refactor `CreatePurchaseOrderDialog` to accept an optional `bidContext` prop, then delete `ConfirmPODialog` and point both bidding row components at `CreatePurchaseOrderDialog`.

### 1. Extend `CreatePurchaseOrderDialog` props
Add (all optional, fully back-compat with the existing PO page usage):
```ts
bidContext?: {
  biddingCompany: BiddingCompany;   // pre-fills + locks company, exposes proposals
  bidPackageId: string;
  costCodeId: string;               // bid package cost code (shown as a read-only chip)
  initialLineItems?: LineItemInput[]; // AI-extracted lines
  isExtracting?: boolean;           // show the sparkles loader instead of the form
  mode?: 'send' | 'resend';
  onConfirm?: () => void;           // called after success so the row can refresh bidding state
};
```

### 2. Behavior changes inside the dialog when `bidContext` is provided
- Pre-select the company from `biddingCompany.companies` and render the company field as read-only text (matching the current Confirm PO look) instead of `CompanySearchInput`.
- Seed `lineItems` from `bidContext.initialLineItems` on open; otherwise fall back to one empty line.
- Render the existing "Sending To" recipients block (fetch `company_representatives` with `receive_po_notifications = true`).
- Render the existing Proposal column + file preview/delete in the line items table (only when `bidContext` is set).
- When `isExtracting`, render the existing sparkles loading state (extracted into a tiny inline component) instead of the form — same UX as today.
- On submit, route through `usePOMutations` (`createPOSendEmailAndUpdateStatus` for `send`, `resendPOEmail` for `resend`) instead of the inline `supabase.from('project_purchase_orders').insert(...)` path. This preserves the bidding-side side effects (status update, package close, etc.). Without `bidContext`, keep the current direct insert/update path unchanged.
- Title becomes "Confirm PO" / "Resend PO" when `bidContext` is present; otherwise "Create Purchase Order" / "Edit Purchase Order" as today.
- Submit button styling stays neutral (shadcn default) — no green/red recoloring, per the project's standardization-over-customization rule.

### 3. Update the two bidding callers
- `src/components/bidding/BiddingTableRow.tsx` and `src/components/bidding/components/BiddingCompanyRow.tsx`: replace `<ConfirmPODialog ... />` with `<CreatePurchaseOrderDialog bidContext={{ ... }} ... />`. Same props mapped 1:1 (biddingCompany, bidPackageId, costCodeId, initialLineItems, isExtracting, mode, onConfirm).

### 4. Delete the old file
- Remove `src/components/bidding/ConfirmPODialog.tsx`.

## What stays the same
- The "Creating PO from machine learning" loader still appears before the dialog form.
- AI extraction of proposal line items still runs in the row component and is passed in as `initialLineItems`.
- Resend flow, recipient list, proposal preview, file delete confirmation — all preserved, just rendered by the unified dialog.
- The Purchase Orders page usage of `CreatePurchaseOrderDialog` is unchanged because every new prop is optional.

## Out of scope
- No DB schema changes.
- No edge function changes.
- No changes to `usePOMutations`, `usePurchaseOrderLines`, or the bidding mutations.
- No visual restyling beyond making the bidding flow inherit the Create PO layout.

## Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` — extend with `bidContext` branch.
- `src/components/bidding/BiddingTableRow.tsx` — swap dialog import + usage.
- `src/components/bidding/components/BiddingCompanyRow.tsx` — swap dialog import + usage.
- `src/components/bidding/ConfirmPODialog.tsx` — delete.
