# Fix 5-cent line errors on LCS bill 26753 (100 Nob Hill)

## What's wrong (confirmed from the saved bill)
Each line is split across 19 lots. Two lines had their pennies spread wrong between lots:

| Line | LCS invoice (x 90%) | Saved now | Fix |
|---|---|---|---|
| Storm Install | $21,511 x .9 = **$19,359.90** | $19,359.95 (+$0.05) | 4 lots at $1,018.95, 15 at $1,018.94 |
| Fine Grade Building Pad | $2,000 x .9 = **$1,800.00** | $1,799.95 (-$0.05) | 13 lots at $94.74, 6 at $94.73 |

The two errors cancel out, so the bill total ($46,878.30) was already right. All other lines match the invoice.

## Changes
1. Correct the 10 affected lot amounts on bill 26753 (5 Storm Install lots down 1 cent, 5 Fine Grade lots up 1 cent).
2. Make the same change on the bill's matching accounting entry so job costs match. Bill total, A/P and bank balances don't change.
3. Find why the split went wrong when the bill was entered (lot split / penny-spread logic) and fix it so each line's lots always add up exactly to that line's amount.
4. Check other recent LCS Nob Hill bills for the same issue and report any I find before changing them.

## Technical details
- Data fix via SQL on `bill_lines` and `journal_entry_lines` of journal entry `ab904141-71e0-48ae-aaa3-ca3355a2d1d1`, matched by memo + lot_id (same lots in both).
- If Aug 2026 is a closed period for Nob Hill, confirm before editing.
- Root-cause candidates: lot distribution in the bill entry and extraction flows (`billLineMath`, `split-pending-bill-lines`). Remainder must be computed per line, not across the bill.
