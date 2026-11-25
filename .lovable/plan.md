# Bill issues only: spreadsheet with real details

## What I found (checked against the books today)

**Real problems: 5 bills, $725.78 overstated.** On each of these the bill line was entered twice. The vendor was paid the correct amount once, but job costs and Accounts Payable were posted at double. That leaves a fake open balance in A/P and inflates job cost.

| Job | Vendor | Invoice # | Real amount | Posted to books | Overstated |
|---|---|---|---|---|---|
| 126 Longview Drive | Dominion Energy | 07062026-Longview SFD | $211.54 | $423.08 | $211.54 |
| 1416 N Longfellow | Fiverr | FO21BF68CBB86 | $177.58 | $355.16 | $177.58 |
| 1639 N Woodstock | Fiverr | FO4232E203906 | $164.92 | $329.84 | $164.92 |
| 214 N Granada | Dept. of Environmental Quality | INV-79577 | $120.00 | $240.00 | $120.00 |
| 214 N Granada | Pita House Restaurant | 8H5-00FAA | $51.74 | $103.48 | $51.74 |

**Doubled before, already fixed by staff (now correct, worth a second look): 5 bills**
- 412 E Nelson: Green Landscaping MSG680 ($1,523.00, not paid yet; outside payment of $3,046 was scheduled), LCS Roll-off D9432 ($1,229.60, "please double check amount")
- 126 Longview: Green Landscaping MSG625 ($654.00), Dominion Energy 08062026 ($223.21)
- 2401 N Potomac: Green Landscaping MSG624 ($158.00)

**Not problems, will be removed from the list: 4 bills.** The dollars are correct and paid correctly; only the quantity or rate field is off.
- 103 E Oxford, City Concrete #33606 ($16,750.00): split evenly across 2 lots. "Window wells (2) @ $1,200" shows qty 2 but $1,200 per lot, which is correct ($2,400 total).
- 103 E Oxford, Simpson Properties #02032026 ($15.00): Raymond's key split $7.50 per lot; rate still shows $15.
- 115 E Oceanwatch, L&L Drywall #2444 ($32,900.00): painting draw qty 0.5161 x $15,500 is 45 cents off from $8,000 due to rounding.
- 923 17th St South, An Exterior #C26019 ($27,180.00): no quantity/rate filled in.

## What I'll deliver
Per your request, every bill with any suspected issue is included (15 bills: the 14 above plus MSG623 at 2401 N Potomac, noted as a "decimal problem"). No clean bills.

1. **Spreadsheet `BuilderSuite-Bill-Issues-Only.xlsx`**, one row per suspect bill, grouped by category (Real Problem / Previously Doubled - Fixed / Field Mismatch Only), with job, vendor, invoice #, bill and due dates, status, bill total, amount posted to books, overstated amount, amount paid, open balance, who entered/approved/paid, plain-English explanation, staff notes, and the PDF file name. Second tab: line-by-line detail for those bills only. Totals on each.
2. **Invoice PDFs**: all 16 attached PDFs for these 15 bills (every one has a file on record), downloaded and named `Job - Vendor - Invoice#.pdf`, bundled into `BuilderSuite-Suspect-Bill-PDFs.zip`. Also one combined `BuilderSuite-Suspect-Bills-Combined.pdf` in the same order as the spreadsheet so you can flip through them.

Nothing in the books gets changed. Fixing the 5 real problems would be a separate step once you approve.

## Technical details
- Source: bills, bill_lines, journal_entries/lines (source_type bill and bill_payment), bill_payments, users. Verified bill JEs total 2x the header while payment JEs equal the header.
- PDFs fetched from the bill attachments storage using file paths in bill_attachments; merged with pypdf.
- Build with openpyxl in /tmp, recalc with recalculate_formulas.py, save as a new file in /mnt/documents.
