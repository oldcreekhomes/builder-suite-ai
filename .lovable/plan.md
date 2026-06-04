## Update NobHillCourt_Costs_By_CostCode.xlsx

Regenerate the Nob Hill costs-by-cost-code sheet so the line items sum to the confirmed bills total of **$446,724.08** ($376,284.25 + $63,082.09 + $7,357.74).

### Steps
1. Re-query bill lines for the Nob Hill Court project across Bills in Review, Approved, and Paid tabs (excluding reversals), grouped by cost code.
2. Verify the aggregated total equals $446,724.08. If a delta exists, surface it as an "Uncategorized" row so the sheet ties exactly.
3. Write `/mnt/documents/NobHillCourt_Costs_By_CostCode.xlsx` with:
   - Header: NOB HILL COURT — COSTS BY COST CODE, address, source line (same as current).
   - Columns: Cost Code | Description | Total Cost.
   - One row per cost code, sorted by code.
   - Grand Total row at the bottom = $446,724.08.
   - Currency formatting `$#,##0.00`.
4. Deliver as a downloadable artifact.

No app code changes.