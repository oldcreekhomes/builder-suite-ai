

## Add Edit Deposit Support to Job Cost Actual Dialog

Since there is no standalone `EditDepositDialog` (deposits are edited inline on the Make Deposits page), the best approach is to navigate the user to the Make Deposits page with a query parameter so the deposit loads automatically for editing.

### Changes

**File: `src/components/reports/JobCostActualDialog.tsx`**

1. Add `useNavigate` import from `react-router-dom`
2. Track `deposit_id` on enriched lines (same pattern as `bill_id`) -- set it when `sourceType === 'deposit'`
3. Add a `handleEditDeposit` function that navigates to `/project/${projectId}/accounting/banking/make-deposits?depositId=${depositId}` and closes the dialog
4. In the Actions column, extend the condition to show the 3-dot `TableRowActions` menu for deposits too (when not reconciled and not date-locked), with an "Edit Deposit" action

**File: `src/components/transactions/MakeDepositsContent.tsx`**

5. Read `depositId` from URL search params on mount
6. If a `depositId` is present, find and load that deposit using the existing `loadDepositData` function (same flow as clicking a deposit in the search dialog)

### Technical Details

In `JobCostActualDialog.tsx`:
- Add `deposit_id` to the `JournalEntryLine` interface
- In the mapping logic where `sourceType === 'deposit'`, set `deposit_id = sourceId`
- The Actions cell condition changes from `line.bill_id && !locked` to `(line.bill_id || line.deposit_id) && !locked`, with appropriate action labels

In `MakeDepositsContent.tsx`:
- Use `useSearchParams` to read `depositId` query param
- Add a `useEffect` that, when `depositId` is present and deposits are loaded, finds the matching deposit and calls `loadDepositData` on it

### Files Changed
| File | Change |
|------|--------|
| `src/components/reports/JobCostActualDialog.tsx` | Add deposit_id tracking, navigate to Make Deposits page on edit |
| `src/components/transactions/MakeDepositsContent.tsx` | Read depositId from URL params and auto-load that deposit |

