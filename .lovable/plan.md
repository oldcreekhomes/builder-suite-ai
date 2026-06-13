# Fix: Edit Deposit opens both dialogs in Account Detail

## Problem
In `AccountDetailDialog` (Balance Sheet → account drawer), each transaction row's `<TableRow>` has an `onClick` that opens the Transaction Details dialog. The Actions (⋯) menu lives inside that same row, so clicking "Edit Deposit" bubbles up to the row handler — opening both Transaction Details *and* Edit Deposit at the same time.

## Fix
In `src/components/accounting/AccountDetailDialog.tsx`, stop click propagation on the Actions cell wrapper so clicks on the ⋯ menu (Edit Deposit / Edit Bill / Edit Check / Delete / Edit Description) don't trigger the row's `setSelectedTransaction`.

Change the Actions `<TableCell>` (line 1618) to add:
```tsx
onClick={(e) => e.stopPropagation()}
```

That's the only change. No behavior change for normal row clicks, no data/hook changes.
