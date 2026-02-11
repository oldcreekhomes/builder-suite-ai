

# Fix 413 E Nelson: Split 104 Unallocated Journal Entry Lines 50/50

## Problem

The previous data fix for 413 E Nelson only split `bill_lines` between the two lots. It did **not** split `journal_entry_lines`, leaving 104 lines with no lot allocation. This causes reports to malfunction because the journal entries (which drive the Balance Sheet, per-lot calculations, and payment recognition) don't know which lot they belong to.

412 E Nelson works because our recent migration handled both tables. 413 needs the same treatment for its journal entry lines.

## What Needs Fixing

104 unallocated journal entry lines across these source types:

| Source Type | Lines | Description |
|---|---|---|
| bill | 46 | Cost allocations and A/P credits from posted bills |
| bill_payment | 22 | Payment debits and A/P debits from bill payments |
| check | 4 | Check transaction entries |
| manual | 12 | Manual journal entries |
| deposit | 20 | Deposit transaction entries |

Additionally, 6 unallocated bill lines exist on a voided bill (ref 11893, status "void"). These don't affect reports but should be cleaned up for consistency.

## Project Details

- Project ID: `c245acb9-53a0-4b23-9c9f-223c372766aa`
- Lot 1: `a346f784-42bf-4734-a442-e9408a2257a5`
- Lot 2: `2bc5967c-03c6-4de3-ac01-47773991fbf6`

## Splitting Logic

Same approach used successfully for 412:
- Lot 1 amount = ROUND(original / 2, 2)
- Lot 2 amount = original - Lot 1 amount (remainder approach ensures exact totals)
- Debits and credits split independently using the same method

## Technical Steps

### Step 1: Split Unallocated Journal Entry Lines
For each of the 104 unallocated journal_entry_lines in 413:
1. Update existing line: set lot_id to Lot 1, debit = ROUND(debit/2, 2), credit = ROUND(credit/2, 2)
2. Insert new line for Lot 2 with remainder amounts

### Step 2: Split Voided Bill Lines (cleanup)
For the 6 unallocated bill_lines on the voided bill:
1. Update existing line: set lot_id to Lot 1, amount = ROUND(amount/2, 2)
2. Insert new line for Lot 2 with remainder

### Step 3: Verification
After migration, verify:
- 0 unallocated bill_lines remaining for 413
- 0 unallocated journal_entry_lines remaining for 413
- All journal entries remain balanced (debits = credits per entry)

## No Code Changes Required
This is purely a data correction using the same approach that fixed 412.
