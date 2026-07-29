## Goal
On the Paid tab for 214 N Granada, 8 bills show a blank Address because their bill lines have no lot assigned. Assign all of them to Lot 1.

## Confirmed current state
Project `214 N Granada` has Lot 1 (`bc4bf662…`) and Lot 2 (`5d2f8419…`). These paid bills have exactly one line each with no lot:

| Vendor ref | Bill date | Amount |
|---|---|---|
| 11192025 (Old Creek) | 11/19/25 | $100.00 |
| 12092025 (Old Creek) | 12/09/25 | $1,219.00 |
| L2083743104 (Arlington County) | 05/11/26 | $4,678.74 |
| 370 (ELG Consulting) | 06/01/26 | $85.00 |
| 7772037697 (Cava) | 06/02/26 | $13.04 |
| 111-0174241-2553051 (Amazon) | 06/09/26 | $15.24 |
| 113-7554022-6966655 (Amazon) | 06/09/26 | $12.04 |
| 111-6199372-8583440 (Amazon) | 06/10/26 | $12.86 |

All other paid bills already have Lot 1. Review / Rejected / Approved bills are untouched.

## Change
Data-only update — no code changes.

1. Set `bill_lines.lot_id = Lot 1` for lines with `lot_id IS NULL` belonging to bills in this project with status `paid`.
2. Mirror the same lot on the corresponding `journal_entry_lines` rows (source_type `bill`) for those bills, so job-cost/lot reporting stays consistent.
3. Verify: re-query the paid bills and confirm zero lines without a lot, and that each bill's line total still equals its header amount.

No bills in other statuses and no other projects are affected.
