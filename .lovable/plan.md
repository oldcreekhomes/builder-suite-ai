# Nob Hill opening entry: replace lump WIP with job-cost detail

Data-only change to the existing 03/31/2026 "Opening Balance - QuickBooks Conversion 3/31/2026" journal entry. No code edits.

## What changes

Today the entry has 19 lump WIP lines (101,136.39 x 18 + 101,136.31) with no cost code. I'll replace those 19 lines with cost-coded WIP lines from your Job Costs Report: every non-zero cost code, each split evenly across the 19 lots (remainder absorbed on lot 19).

Everything else on the entry stays exactly as is:

| Account | Debit | Credit |
|---|---|---|
| 1010 Atlantic Union Bank | 28,208.67 | |
| 1020 Deposits | 4,200.00 | |
| 1430 WIP (cost-coded, 19 lots each) | 1,921,591.33 | |
| 2530.1 Loan Land - Russell Trust | | 903,000.00 |
| 2530.2 Loan Land - McVeigh 2nd Trust | | 320,000.00 |
| 2905.1 Equity Partner #1 | | 731,000.00 |

Report total ties exactly: 1,223,036.21 + 665,019.17 + 11,548.50 + 21,987.45 = 1,921,591.33.

## Cost codes being posted (42 non-zero)

Land: 1010 (1,187,500.00), 1020 (35,108.71), 1030 (427.50)

Soft costs: 2050 144,779.80 · 2055 3,002.00 · 2065 40,174.96 · 2070 9,029.00 · 2080 28,017.41 · 2100 10,900.00 · 2110 1,600.00 · 2120 45,193.84 · 2130 1,710.00 · 2140 4,370.00 · 2160 8,863.02 · 2180 233.80 · 2200 451.25 · 2220 165.49 · 2240 57,676.27 · 2280 11,096.00 · 2300 2,375.00 · 2380 16,243.81 · 2420 2,192.00 · 2440 249,406.24 · 2450 30.78 · 2480 45.37 · 2520 24.38 · 2620 27,438.75

Site: 3060 76.00 · 3260 11,472.50

Homebuilding: 4120 273.60 · 4300 285.00 · 4830 1,663.69 · 4850 38.85 · 4860 490.44

Zero-dollar codes are skipped.

## Numbering mismatch I need to handle

Your QuickBooks 4000-series numbers do not match the app's cost codes, so these get remapped by name:

| QuickBooks | App cost code | Amount |
|---|---|---|
| 4010.2 Office Supplies | 4040 Office Supplies | 10.55 |
| 4010.3 Office | 4015 Office | 66.87 |
| 4010.4 Project Manager | 4020 Project Manager | 13,024.98 |
| 4010.5 Accounting | 4025 Accounting | 788.03 |
| 4010.6 Other | 4030 Other | 19.00 |
| 4030 Signage | 4060 Signage | 801.42 |
| 4050 Marketing | 4080 Marketing | 4,430.02 |

The 1000/2000/3000 series codes match one-for-one, so they post as-is.

## One open question

**QuickBooks 4160 Permits & County Fees ($95.00) has no matching cost code in the app.** Tell me where it should go — 3060 Permits & Fees, 2120 Permit Fees, or a new 4160 cost code. I'll hold that $95 until you say.

## Technical details

- Delete the 19 uncoded WIP lines on journal entry `d6b83ca9...` and insert 798 replacement lines (42 codes x 19 lots), account 1430, project Nob Hill, same memo.
- Per-code split: `floor(amount/19)` to cents on lots 1-18, remainder on lot 19, so each code sums exactly.
- Entry stays balanced at 1,954,000.00 debits = credits; the 1010 line keeps its cleared flag against the 03/31 opening reconciliation.
- Verification after the change: sum of WIP lines = 1,921,591.33, per-code totals match the report line for line, and the Job Costs screen shows each code across all 19 lots.
