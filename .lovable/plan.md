# Fix City Concrete 34027 and stop new bill lines from merging into lot groups

Two parts: a one-time data fix on the bill, and a code fix so adding a line in Edit Bill no longer collapses into an existing lot-split row.

## Part 1 — Bill 34027 (City Concrete, 2401 N Potomac, 07/13/2026)

Today the bill is voided at $13,250.00, split across lots 2401 A / B / C, cost code 3350 Retaining Walls, with no journal entries attached.

Changes:

| Lot | Amount |
|---|---|
| 2405 A | 2,208.33 |
| 2405 B | 2,208.33 |
| 2405 C | 2,208.34 |
| **Total** | **6,625.00** |

- Re-point the three existing lines to lots 2405 A, 2405 B, 2405 C.
- Set quantity 1 and unit cost equal to each lot amount above (even split, remainder on the last lot).
- Update the bill header total to $6,625.00.
- Keep cost code 3350 and the existing description.
- Bring the bill out of void back to posted, and rebuild its journal entry the same way other posted City Concrete bills at this project look: debit 1430 WIP per lot (cost code 3350), credit 2010 Accounts Payable $6,625.00, dated 07/13/2026.

If you'd rather leave it voided, say so before approving and I'll skip the last bullet.

## Part 2 — "Add Line" merges into the 3 consolidated lots

Cause: the display grouping used by Edit Bill merges any two lot-distributed rows that share cost code + description + purchase order, regardless of unit cost. A newly added line on the same cost code therefore disappears into the existing "All 3 lots" row.

Fix: only merge rows that are genuinely the same line split across lots — same cost code, same description, same purchase order, **and** non-overlapping lots. If a candidate row uses a lot already present in the group, it stays its own row. A brand-new line keeps its own row and its own lot allocation.

## Technical details

- Data fix: update `bill_lines` (lot_id, unit_cost, amount) and `bills.total_amount` for bill `4e47ef5d-3001-46c4-ad52-66b21d5be3fa`; insert a balanced `journal_entries` / `journal_entry_lines` pair mirroring the pattern on ref 34028.
- Code fix: `src/lib/billLineMath.ts` — in the second merge pass of `groupBillLines`, skip merging a candidate bucket whose `lotId` set intersects the lots already collected in the group.
- No change to totals math; footer stays the sum of displayed group amounts.
