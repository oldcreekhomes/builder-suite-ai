# Replace "Cleared" column with unified lock in Actions

## Goal
Remove the low-signal **Cleared** column on the **Approved** and **Paid** tabs of Manage Bills. When a row is read-only — for any reason — replace the `⋯` trigger with a red lock icon. Clicking it still opens the actions menu, but mutating items (Edit, Delete, Void, Pay, Unpay, etc.) are disabled and explain why via the standard shadcn `Tooltip`.

## Lock semantics (unified)
A row is locked when **any** of these are true:
1. The bill's payment is **cleared/reconciled** (`bill_payments.reconciled = true`, or for the Approved tab any associated payment that is cleared).
2. The bill's date falls inside a **closed accounting period** (already handled by `useIsTransactionLocked`).

The lock icon is the same in both cases; only the tooltip copy differs:
- Cleared:  *"Locked — payment cleared on {date}. Unreconcile to edit."*
- Closed period:  *"Locked — accounting period closed on {date}. Reopen the period to edit."*
- Both:  combine into a two-line tooltip, cleared shown first.

## Scope
- **Approved** tab and **Paid** tab only.
- Review / Rejected / Enter tabs: unchanged (no `Cleared` column today, no payment concept).

## Changes

### UI
- Remove the `Cleared` `<TableHead>` and corresponding `<TableCell>` from the Approved and Paid table renderers.
- In the Actions cell, when `isLocked` is true:
  - Render a red lock icon (`Lock` from lucide-react, `text-destructive`) as the `DropdownMenuTrigger` instead of the `MoreHorizontal` icon.
  - Wrap the trigger in shadcn `<Tooltip>` / `<TooltipTrigger>` / `<TooltipContent>` with the reason copy above.
  - Inside the menu, keep View / Download / View History enabled. Apply `disabled` to Edit, Delete, Void, Mark as Paid, Unmark Paid, Apply Credit, etc. Each disabled item gets a nested tooltip with the same reason.
- When `isLocked` is false: behavior unchanged (current `⋯` trigger and full menu).

### Logic
- Add a small helper `useBillLockReason(bill)` (or extend `useIsTransactionLocked`) that returns `{ isLocked, reason, clearedDate, closedDate }`. It consolidates:
  - `bill_payments` reconciled status for any payment allocated to this bill,
  - the existing closed-period check.
- Use this hook in the Actions cell renderer for both tabs so the two tabs stay in sync.

### No backend / schema changes
Read-only UI refactor. No migrations, no edge functions, no RLS changes.

## Files likely touched
- `src/components/bills/BillsApprovalTabs.tsx` (or the Approved/Paid tab table components it renders)
- The row/action-cell component used by those tabs
- New: `src/hooks/useBillLockReason.ts` (thin wrapper around existing lock logic)
- Existing `useIsTransactionLocked` — reused, not modified unless needed for the `closedDate` field

## Out of scope
- Changing how reconciliation actually happens
- Adding a way to filter/sort by locked state (the column is gone; if needed later we can add a filter chip)
- Any change to Review / Rejected tabs

## Acceptance
- Approved and Paid tabs no longer show a Cleared column.
- Cleared rows display a red lock instead of `⋯`; hovering shows the shadcn tooltip with the cleared date.
- Rows inside a closed period also show the lock with the period tooltip.
- Clicking the lock opens the menu; mutating actions are disabled with their own tooltips; View/Download still work.
- Unlocked rows look and behave exactly as today.
