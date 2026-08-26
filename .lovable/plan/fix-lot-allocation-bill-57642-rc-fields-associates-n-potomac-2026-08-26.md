# Fix lot allocation — Bill 57642 (RC Fields & Associates, N Potomac)

## What was found

Bill `57642` ($4,150.00, posted) at project 2401 N Potomac. The 5th line item, **"#1 - Brick Points - 2401 (A,B,C) N Potomac St"** ($250 × 3 = $750.00), is described as 2401 in its description but is actually allocated to the **2405 A/B/C** lots in the database.

## Changes (data only, no code)

Update the lot on the three Brick Points rows from 2405 → 2401, keeping amounts unchanged:

| Amount | From lot | To lot |
|---|---|---|
| $250.00 | 2405 A | 2401 A |
| $250.00 | 2405 B | 2401 B |
| $250.00 | 2405 C | 2401 C |

Two tables are updated so the bill and Job Costs reports stay in sync:

1. **bill_lines** — the 3 Brick Points rows (line_number 13–15) on bill `5716dc81-7b29-459c-9d93-ae692ce77b9d`
2. **journal_entry_lines** — the matching 3 debit lines ($250 each on 2405 A/B/C) on journal entry `c7337e83-e720-4406-9eae-9956e0c6faab`

Bill total stays $4,150.00; journal entry stays balanced. All other line items on the bill are untouched.
