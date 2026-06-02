I found the problem: the rows currently pulling “historical” actuals are pointed at historical **Lot 507**, not **Lot 506**. The uploaded PDF is for **Lot 506**, and the database already has the Lot 506 actuals for staging, sales commissions, loan closing costs, sediment/erosion, demolition, etc.

Plan:

1. Update the affected current project budget rows to use historical source **Lot 506** instead of **Lot 507**.
   - Historical project: `d9e400a0-f9b9-40c6-8b8e-183341e508f3`
   - Correct historical lot: `5d28a702-82fa-4416-8d86-d47c24f8a566` (`Lot 506`)
   - Wrong historical lot currently used on copied rows: `8ae0a660-59f6-4289-9943-e7fcc0107548` (`Lot 507`)

2. Add/update the missing PDF rows in the current project budget for Lot 1 so they appear in the second column/source list:
   - `2560` Staging — Est. `1,535.74`, Actual `1,544.74`
   - `2580` Sales Commission(s) — Est./Actual `27,300.00`
   - `2600` Loan Closing Costs — Est./Actual `3,970.00`

3. Correct the specific wrong PDF-matched rows:
   - `3180` Sediment & Erosion Control — `2,092.91`
   - `3220` Demolition — `2,257.14`

4. Correct the homebuilding copied rows to match the PDF’s Lot 506 actuals, not Lot 507:
   - `4020` Drawings — `68.21`
   - `4030` Signage — `115.98`
   - `4040` Temporary Toilets — `319.61`
   - `4100` Dumpsters — `1,871.78`
   - `4200` Excavation — `5,924.28`

5. Make the frontend Actual Cost display consistently read the per-row historical Lot 506 actual when a budget row is historical, so it does not fall back to a different selected lot/project.

Technical notes:
- This is data correction plus the existing frontend display fix pattern.
- I will use the database data-update path, not a schema migration, because these are existing rows/values.
- I will verify after the update with a read query showing those codes and values.