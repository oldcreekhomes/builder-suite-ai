

## Create EditDepositDialog Component

Build a new `EditDepositDialog` component (similar to `EditBillDialog`) that opens as a modal dialog when clicking "Edit Deposit" from the Job Cost Actual Dialog, instead of navigating away to the Make Deposits page.

### New File: `src/components/deposits/EditDepositDialog.tsx`

Create a dialog component that:
- Accepts `open`, `onOpenChange`, and `depositId` props (same pattern as `EditBillDialog`)
- Loads the deposit data (header + lines + attachments) via a `useQuery` keyed on `depositId`
- Displays an editable form with:
  - **Header fields**: Date, Deposit To (bank account), Received From (vendor), Check #
  - **Tabs**: Chart of Accounts and Job Cost (matching the MakeDepositsContent layout)
  - **Line items**: Account/CostCode, Description, Quantity, Cost, Total, Address (if multiple lots)
  - **Attachments section**
  - **Footer**: Total display + Save button
- Uses the existing `updateDepositFull` mutation from `useDeposits` hook to save changes
- Follows the same form patterns (AccountSearchInputInline, CostCodeSearchInput, VendorSearchInput, DateInputPicker) already used in MakeDepositsContent
- Invalidates relevant query keys on save so the Job Cost report refreshes

### Modified File: `src/components/reports/JobCostActualDialog.tsx`

- Remove the `handleEditDeposit` navigation function
- Remove `useNavigate` import (if only used for deposits)
- Add state: `editingDepositId` (same pattern as `editingBillId`)
- Replace "Edit Deposit" action to call `setEditingDepositId(line.deposit_id)`
- Render `<EditDepositDialog>` at the bottom (same as `<EditBillDialog>`)
- On close, invalidate the job cost actual details query

### Modified File: `src/components/transactions/MakeDepositsContent.tsx`

- Remove the `depositId` URL parameter auto-load logic (lines 212-226) since it's no longer needed

### Technical Details

The `EditDepositDialog` will reuse:
- `useDeposits` hook (`updateDepositFull` mutation) for saving
- `useAccounts` hook for bank account and chart of accounts dropdowns
- `useCostCodeSearch` hook for job cost lines
- `useLots` hook for address column
- `VendorSearchInput` for the "Received From" field
- `AccountSearchInputInline` for account selection
- `CostCodeSearchInput` for cost code selection
- `DepositAttachmentUpload` for file attachments

The dialog will be a `max-w-5xl` dialog (matching EditBillDialog size) with the same tab structure as MakeDepositsContent (Chart of Accounts / Job Cost tabs).

### Files Changed
| File | Change |
|------|--------|
| `src/components/deposits/EditDepositDialog.tsx` | New file -- full edit deposit dialog |
| `src/components/reports/JobCostActualDialog.tsx` | Use EditDepositDialog instead of navigation |
| `src/components/transactions/MakeDepositsContent.tsx` | Remove depositId URL param auto-load logic |

