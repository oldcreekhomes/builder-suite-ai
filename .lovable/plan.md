# Move the Wall Check line on bill 57642 to 2401 A/B/C

The Wall Check item ($1,000.00 total) on RC Fields & Associates bill 57642 at N Potomac is allocated to the 2405 lots. It should be on 2401 A/B/C.

## What changes

| Amount | Lot now | Lot after |
| --- | --- | --- |
| $333.33 | 2405 A | 2401 A |
| $333.33 | 2405 B | 2401 B |
| $333.34 | 2405 C | 2401 C |

Amounts, cost code (2055 Surveying), description, dates and bill total ($4,150.00) stay unchanged. No other line item is touched.

## Technical details

Data-only update, no code changes:

1. Repoint `bill_lines` rows 16-18 on bill `5716dc81-7b29-459c-9d93-ae692ce77b9d` from the 2405 A/B/C lot ids to the 2401 A/B/C lot ids.
2. Repoint the matching debit lines on the bill's journal entry the same way, so Job Costs stays in sync.
3. Verify the bill still totals $4,150.00, debits equal credits, and the Address hover shows 2401 A / B / C.
