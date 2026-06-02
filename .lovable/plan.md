## Goal

Make Save & Close behave like Save & New on the transaction forms — save the entry, clear the form for a fresh one, and stay on the same Transactions tab. No more bouncing out to the Accounting Dashboard.

## Changes

Remove the `navigate('/accounting')` call from the Save & Close handler in each of the four forms. Keep the existing save + `createNewCheck()` / equivalent reset so the form clears for the next entry.

1. `src/components/transactions/WriteChecksContent.tsx` — `handleSaveAndClose` (line 715): drop the `navigate(...)` line.
2. `src/components/transactions/MakeDepositsContent.tsx` — equivalent save-and-close (line 768): drop the `navigate(...)` line.
3. `src/components/transactions/CreditCardsContent.tsx` — equivalent save-and-close: drop the `navigate(...)` line (verify exact location during edit).
4. `src/components/journal/JournalEntryForm.tsx` — `handleSaveAndClose` (line 501): drop the `navigate(...)` line.

Also remove the now-unused `useNavigate` import / `navigate` variable in any file where this was the only usage.

## Verification

- Open Write Checks, save with each of the three buttons → form behavior:
  - **Save** — stays, viewing mode.
  - **Save & New** — stays, fresh blank form.
  - **Save & Close** — stays, fresh blank form (was: jumped to Accounting Dashboard).
- Repeat for Make Deposits, Credit Cards, Journal Entry.
- Confirm no TypeScript errors from the removed import.
