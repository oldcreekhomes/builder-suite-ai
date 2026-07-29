## Goal
Move every cost at 214 N Granada off **Lot 2** and onto **Lot 1**, merging split lines so each bill shows one line per cost code at its full amount. Lot totals stay identical to the bill totals — nothing changes financially.

Example: a $200 bill split $100 / $100 across Lot 1 and Lot 2 becomes a single $200 line on Lot 1.

## What's on Lot 2 today (verified)
| Table | Lot 2 rows | Lot 1 rows | No lot |
|---|---|---|---|
| bill_lines | 25 ($21,716.15) | 35 ($41,609.64) | 8 ($6,135.92) |
| journal_entry_lines | 27 | 36 | 130 |
| deposit_lines | 3 | 3 | 8 |
| check_lines | 1 | 1 | 2 |
| project_budgets | 0 | 89 | 0 |
| bills / purchase orders | 0 | 0 | all |

Budgets are already fully on Lot 1. Lines with no lot (like the single-lot Anchor Loans entries you pointed at) are untouched.

## Plan (data only, no code changes)

1. **Merge split bill lines.** For each bill where the same cost code appears on both Lot 1 and Lot 2, the Lot 1 line absorbs the Lot 2 amount (amounts and quantities summed, unit cost recalculated cent-precise from the new total), then the Lot 2 line is deleted. Lot 2 lines with no Lot 1 counterpart are simply retagged to Lot 1.
2. **Retag the other transaction lines.** Set Lot 1 on the remaining Lot 2 rows in `journal_entry_lines`, `deposit_lines`, and `check_lines`. These are not merged — journal entries must stay one-to-one with their source rows so the GL stays balanced.
3. **Verify.** Confirm zero rows anywhere still reference Lot 2, and confirm every affected bill's line total still equals its header amount to the cent.
4. **Report back** with before/after totals so you can then delete Lot 2 yourself from Edit Project.

## Notes
- Bill totals, payments, journal entries, and the Balance Sheet are unaffected.
- I will not delete Lot 2 — that stays your call after review.
