## Goal
Make the bidding "Confirm PO" dialog **visually identical** to the standard Create Purchase Order dialog. No bidding-specific layout differences. The only thing the bidding flow keeps is its under-the-hood behavior (locked company, AI line items, mutation routing, status close).

## What's wrong today
Even though both flows now use `CreatePurchaseOrderDialog`, I left a `bidContext` branch that renders a completely different layout:

| | Create PO (correct template) | Confirm PO (today, wrong) |
|---|---|---|
| Header title | "Create Purchase Order" | "Confirm PO" |
| Top row | 2 cols: **Company \| Notes** | 3 cols: Company \| Bid Package Cost Code \| Sending To |
| Line items table | Cost Code, Description, Qty, Unit Cost, Amount, Extra, Actions | adds extra **Proposal** column |
| Bottom row | 2 cols: **Custom Message (rows=2) \| Attachments dropzone** | 1 full-width Custom Message, no attachments |
| Submit button | "Create Purchase Order" | "Send PO" |

The user's screenshots confirm: Create PO is the canonical layout. Confirm PO must mirror it exactly.

## Changes (all in `src/components/CreatePurchaseOrderDialog.tsx`)

### 1. Header title
Always render "Create Purchase Order" (or "Edit Purchase Order" when `editOrder`). Drop the "Confirm PO" / "Resend PO" titles.

### 2. Top row — always 2 columns: Company + Notes
Remove the bidding 3-column branch entirely. Render the same `CompanySearchInput` + Notes `Input` for both flows.
- For `bidContext`, pre-select the company on open (already happens) and pass `disabled` to `CompanySearchInput` so the user can't change it (locked but visually identical to a populated search field). If `CompanySearchInput` doesn't support `disabled`, fall back to a regular `<Input value={company.name} disabled />` styled the same — same height, same border, same placeholder slot.
- The "Bid Package Cost Code" chip and "Sending To" recipients block are **deleted from the dialog**. Recipients are still implicitly used by the edge function via `company_representatives` server-side; the user doesn't need to see them in the dialog (matches Create PO behavior). Remove the `recipients` / `costCodeData` / `managerName` fetches that exist solely to feed those removed UI blocks.

### 3. Line items table — drop the Proposal column
Remove the `isBidFlow && <TableHead>Proposal</TableHead>` column and its body cell. The proposal file stays accessible from the bidding row itself (where it already lives) — it doesn't need to be re-rendered inside the PO dialog. Also drop the `DeleteConfirmationDialog` for proposals and the `useBiddingCompanyMutations` import that's only used here.

After removal: every table column matches Create PO 1:1.

### 4. Bottom row — always 2 columns: Custom Message + Attachments dropzone
Remove the `isBidFlow ? full-width message : 2-col` branch. Always render the `grid grid-cols-2` layout with Custom Message (Textarea, rows=2) on the left and the Attachments dropzone on the right.
- Bidding flow currently can't upload attachments because submission goes through `usePOMutations` (which doesn't accept a `files` array). Fix: pass `uploadedFiles` into `createPOSendEmailAndUpdateStatus` by extending the mutation's payload to accept an optional `files` array, then merge it with the proposal-derived files inside `usePOMutations.createPOAndSendEmail` (it already builds `purchaseOrderData.files` from proposals — just concat the user-uploaded files). This is a small, additive change in `src/hooks/usePOMutations.ts` only — no schema or edge-function changes.
- Remove the resend-only "Amount" summary block; resend mode keeps the same layout (line items already render).

### 5. Submit button label
Always "Create Purchase Order" / "Updating..." / "Creating...". Drop "Send PO" / "Resend PO" / "Sending..." labels. The bidding flow still routes through `createPOSendEmailAndUpdateStatus` / `resendPOEmail` under the hood — only the visible label changes.

### 6. Keep working under the hood (no UX-visible change)
- AI extraction loader ("Creating PO from machine learning") still shows when `isExtracting`.
- `bidContext.initialLineItems` still seeds the table.
- Submit still calls `createPOSendEmailAndUpdateStatus` (send) or `resendPOEmail` (resend) so the bid package is closed and bidding state refreshes.
- `bidContext.onConfirm?.()` still fires on success.

### 7. Cleanup inside the file
After the above, these become unused and get removed:
- `costCodeData`, `recipients`, `managerName`, `fileToDelete` state
- The `useEffect` that fetches cost code / PM / recipients
- `useUniversalFilePreviewContext`, `useBiddingCompanyMutations`, `Tooltip*`, `DeleteConfirmationDialog`, `getFileIcon/getFileIconColor/getCleanFileName` imports
- `handleProposalPreview` function
- `firstProposal` / `proposals` derivations

## Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` — collapse the bidding-specific UI branches; both flows render the exact Create PO layout.
- `src/hooks/usePOMutations.ts` — accept optional `files` on `createPOAndSendEmail` and merge with proposal files so the bidding flow's Attachments dropzone works.

## Out of scope
- No DB changes.
- No edge-function changes.
- No changes to `BiddingTableRow` / `BiddingCompanyRow` callers (they already pass `bidContext`).
- No restyling of the Create PO dialog itself — it stays as-is and becomes the single source of truth.
