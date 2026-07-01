
## Goal
Take your existing 4/30/2026 "Moving from QB's to BS" journal entry and swap the single **$2,048,291.60 WIP debit** for **180 job-cost lines** (30 cost codes × 6 lots), each still debiting WIP 1430 but now tagged with a cost code + lot. Clean solution — no backend workaround, no second JE.

New spreadsheet totals **$2,048,291.63**, which reconciles to your WIP line (3¢ floating-point noise). JE stays balanced. Balance Sheet does not move. Job Costs report picks these up automatically because Actual reads `journal_entry_lines` filtered by `cost_code_id`.

## Line ordering
Grouped by cost code, ascending — within each cost code, all 6 lots listed in order before moving to the next cost code:

```
line 3: 1010 Lot Costs — Lot 1
line 4: 1010 Lot Costs — Lot 2
line 5: 1010 Lot Costs — Lot 3
line 6: 1010 Lot Costs — Lot 4
line 7: 1010 Lot Costs — Lot 5
line 8: 1010 Lot Costs — Lot 6
line 9: 1020 Closing Costs — Lot 1
...
line 182: 4860 Lawn Mowing — Lot 6
```

(Lines 1–2 = existing Atlantic Union + Deposits debits, lines 183–186 = existing 4 credit lines — all untouched.)

## Cost code mapping (QB → BuilderSuite)

| BS Code | BS Name | Total | Per Lot (÷6) |
|---|---|---:|---:|
| 1010 | Lot Costs | $1,480,000.00 | $246,666.67 |
| 1020 | Closing Costs | $47,709.75 | $7,951.63 |
| 1040 | Land Taxes | $2,054.39 | $342.40 |
| 2050 | Civil Engineering | $11,613.94 | $1,935.66 |
| 2065 | Architectural | $3,900.00 | $650.00 |
| 2070 | Structural Engineering | $18,840.00 | $3,140.00 |
| 2120 | Permit Fees (incl. QB 3060 + 4160) | $17,385.15 | $2,897.53 |
| 2220 | Marketing | $83.04 | $13.84 |
| 2240 | Legal – Land Use | $12,934.00 | $2,155.67 |
| 2420 | GL Insurance | $325.00 | $54.17 |
| 2440 | Land Carrying Costs | $263,041.99 | $43,840.33 |
| 2450 | Home Building Carrying Costs | $105.00 | $17.50 |
| 2480 | Miscellaneous Costs | $36.30 | $6.05 |
| 2620 | Real Estate Taxes | $19,798.02 | $3,299.67 |
| 3180 | Sediment & Erosion Control | $3,524.25 | $587.38 |
| 3220 | Demolition | $14,035.00 | $2,339.17 |
| 3230 | Water & Sewer Shut Off | $2,800.00 | $466.67 |
| 3260 | Site Remediation | $650.00 | $108.33 |
| 3300 | Site Clearing | $1,500.00 | $250.00 |
| 4005 | Backcharges/GC (incl. QB 4005 + 4015 Count Lawsuit + 4999 Ask Owner) | $135,232.35 | $22,538.73 |
| 4015 | Office (QB 4010.3) | $38.70 | $6.45 |
| 4020 | Project Manager (QB 4010.4) | $7,790.85 | $1,298.48 |
| 4025 | Accounting (QB 4010.5) | $969.27 | $161.55 |
| 4040 | Office Supplies (QB 4010.2) | $1,010.02 | $168.34 |
| 4120 | Labor | $350.00 | $58.33 |
| 4210 | Utilities | $102.61 | $17.10 |
| 4630 | Cabinets | $77.00 | $12.83 |
| 4830 | Landscaping | $320.00 | $53.33 |
| 4850 | Misc. Repairs & Materials | $1,440.00 | $240.00 |
| 4860 | Lawn Mowing | $625.00 | $104.17 |
| **TOTAL** |  | **$2,048,291.63** | **$341,381.94** |

Cent-precise split: `floor(cents/6)` per lot, remainder pennies distributed to lots 1..N so each cost code totals exactly.

## Execution
1. Locate JE dated 4/30/2026, description "Moving from QB's to BS", project 2401 N Potomac.
2. Delete the single WIP debit line ($2,048,291.60).
3. Insert 180 new lines in the order above (cost code, then all 6 lots, then next cost code). Each: account = WIP 1430, debit = per-lot amount, project = 2401 N Potomac, cost_code_id + lot_id set, memo = "QB migration – <cost code name>".
4. Leave the two non-WIP debits and all four credit lines exactly as-is.
5. Verify: total debits = total credits = $2,060,911.01; WIP net debit = $2,048,291.63; Balance Sheet 4/30/2026 unchanged; Job Costs report shows 30 populated Actual rows split across the 6 lots.

## Technical notes
- Direct SQL against `journal_entries` and `journal_entry_lines`.
- Uses the same WIP account already on that JE (`accounts.code = '1430'`).
- Fully reversible via a single query re-collapsing to one WIP line.
- Data-only change — no code edits.
