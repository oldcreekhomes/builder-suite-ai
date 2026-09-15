# Show real addresses in the Address pickers

## Problem

On Journal Entry (and Make Deposits), the address dropdown lists "Lot 1, Lot 2, Lot 3..." instead of the real addresses like 2401 A, 2401 B, 2405 C. Write Checks already shows the real addresses, because it uses the saved address name and only falls back to "Lot N" when no name exists. Journal Entry and Make Deposits always print "Lot N" and ignore the saved name.

## Fix

Use the same display rule as Write Checks in the two screens that still show the wrong label:

- Journal Entry address dropdown
- Make Deposits address dropdowns (two places on that screen)

Rule: show the saved address name; only if a line has no name, show "Lot N".

## Technical detail

- `src/components/journal/JournalEntryForm.tsx` line 840: change `Lot {lot.lot_number}` to `{lot.lot_name || \`Lot ${lot.lot_number}\`}`.
- `src/components/transactions/MakeDepositsContent.tsx` lines 1162 and 1286: same change.
- Display-only change; no data, saving, or accounting logic is touched.
