# Break out the Nob Hill surveying PO into 23 line items

## What this is

PO 2026-100N-0073 at 100 Nob Hill Ct — RC Fields & Associates, cost code 2055 Surveying, total $69,550.00. It currently has a single line reading "See attached for itemization" for the full $69,550.00.

This is a one-off data entry fix. No code changes.

## What will change

Replace that one line with the 23 defined tasks from the schedule of work, each with the task name as the description and its lump sum as the amount (quantity 1). Tasks 17 (Electric/Telecom Features, hourly) and 25 (Construction Administration, TBD) are skipped as requested — both are hourly/undefined, so the lump-sum total is unaffected.

| # | Description | Amount |
|---|---|---|
| 1 | Establish Horizontal/Vertical Control | 850.00 |
| 2 | Limits of Disturbance | 1,000.00 |
| 3 | Rough Grading - Streets | 850.00 |
| 4 | Rough Grading - Townhouse Pads | 1,750.00 |
| 5 | Fine Grading - Townhouse Pads | 1,500.00 |
| 6 | Pad Check - Townhouse Pads | 1,800.00 |
| 7 | Building Stake-Out Computations | 1,350.00 |
| 8 | Building Stake-Out | 3,600.00 |
| 9 | Brick Points | 3,600.00 |
| 10 | Wall Check Survey | 4,500.00 |
| 11 | Sanitary Sewer | 1,500.00 |
| 12 | Storm Sewer | 4,000.00 |
| 13 | Watermain/Fire Line/Water Service | 1,750.00 |
| 14 | Pavement Features | 2,500.00 |
| 15 | Sidewalks | 1,750.00 |
| 16 | Retaining Walls | 1,750.00 |
| 17 | Certificate of Occupancy Plan Drawings | 7,000.00 |
| 18 | Site As-Built Drawings | 5,000.00 |
| 19 | Stormwater Management Inspections and Certifications | 3,500.00 |
| 20 | Property Corners | 1,000.00 |
| 21 | As-Built Condominium Survey | 2,500.00 |
| 22 | Preliminary Condominium Plats and Plans | 9,000.00 |
| 23 | Final Condominium Plats and Plans | 7,500.00 |

Total: $69,550.00 — identical to the PO total, so nothing downstream changes.

## Technical notes

- Delete the single existing `purchase_order_lines` row for PO `5daf2296-17f0-46cc-acdf-ad31cf0fc72c` and insert 23 rows, line numbers 1–23, each `quantity 1`, `unit_cost = amount`, `extra false`, same cost code (2055 Surveying) as the existing line.
- `project_purchase_orders.total_amount` stays $69,550.00; no journal entries, bills, or budget rows are touched.
- Verification: re-query the lines and confirm 23 rows summing to 69550.00.
