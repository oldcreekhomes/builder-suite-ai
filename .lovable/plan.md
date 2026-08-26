# Move the three Signature Stairs invoices to 2401 A/B/C

The three Signature Stairs invoices at 2401 N Potomac (4360: Interior Stairs, bill date 07/24/26, $3,413.20 each) are allocated to 2405 A/B/C. They belong on 2401 A/B/C, one lot per invoice.

## What changes

| Invoice | Lot now | Lot after | Amount |
| --- | --- | --- | --- |
| 349444-50 | 2405 A | 2401 A | $3,413.20 (3 lines: 1,187.20 / 1,187.20 / 1,038.80) |
| 349447-50 | 2405 B | 2401 B | $3,413.20 (same 3 lines) |
| 349451-50 | 2405 C | 2401 C | $3,413.20 (same 3 lines) |

Amounts, cost code, dates, vendor, status, PO match and attachments are untouched — only the address changes.

## Technical details

Data-only update, no code changes:

1. Repoint the 3 `bill_lines` on each bill (`a2e6ffee-…`, `932b3fd5-…`, `7782e111-…`) from the 2405 A/B/C lot ids to the 2401 A/B/C lot ids.
2. Repoint the matching 3 debit lines on each bill's journal entry (`001efda6-…`, `9e662826-…`, `657dbe7c-…`, all dated 07/24/26) the same way. The $3,413.20 A/P credit line on each carries no lot, so every entry stays balanced.
3. Verify: each bill total still equals the sum of its lines ($3,413.20), debits equal credits, and the Address hover shows 2401 A / 2401 B / 2401 C.
