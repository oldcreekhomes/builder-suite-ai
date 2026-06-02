Got it. The "Historical" dropdown (None / 415 E Nelson / ... / 6330 Stevenson Ave - Lot 506 / Lot 507) is just a picker for a **hardcoded reference table** of actual costs per historical project+lot. Nothing about it relates to Lot 1, the current project, allocations, bills, JEs, or anything live.

## Plan

1. **Use the existing hardcoded historical data as-is**
   - Source: rows in `project_budgets` belonging to the historical project + historical lot, where `actual_amount` is hardcoded.
   - No PDF parsing. No matching. No allocation logic.

2. **Fix the Actual Cost column to follow the Historical selection**
   - When the user selects `6330 Stevenson Ave - Lot 506` from the Historical dropdown, every row's Actual Cost = the hardcoded `actual_amount` for that cost code on **Lot 506 only**.
   - When they pick Lot 507, it shows Lot 507's hardcoded actuals.
   - When they pick `None`, Actual Cost is blank.
   - The selection lives at the **page/budget level**, not per row. One dropdown → drives the whole Actual Cost column.

3. **Remove the per-row historical reference confusion**
   - Stop storing/using `historical_project_id` / `historical_lot_id` per row to drive the Actual Cost display.
   - The dropdown selection alone determines which hardcoded set is shown.
   - Per-row historical fields can still exist for budget *seeding* (copying values into `unit_price`), but they no longer drive the Actual column.

4. **Show all cost codes from the selected historical lot**
   - If Lot 506 has `2560 Staging`, `2580 Sales Commissions`, `2600 Loan Closing Costs`, etc., they appear in the Actual Cost column even if the current Lot 1 budget doesn't have those rows yet.
   - Rows in the budget that have no Lot 506 actual show `-` in Actual Cost.

5. **No data changes needed for Lot 506 itself**
   - Lot 506's hardcoded values (Sediment $2,092.91, Demolition $2,257.14, Drawings $68.21, Signage $115.98, Temp Toilets $319.61, Dumpsters $1,871.78, Excavation $5,924.28, Staging, Sales Commissions, Loan Closing Costs, etc.) already exist in the database. We just need to **read them and display them** when Lot 506 is the chosen Historical reference.

## Technical detail

- `useHistoricalActualCosts(projectId, lotId)` already returns `mapByCode` for a given historical project+lot — that's the right primitive.
- Drive it from a single page-level "selected historical reference" state (project_id + lot_id), persisted on the current project (e.g., `projects.historical_reference_project_id` + `historical_reference_lot_id`) so the choice sticks.
- `BudgetTableRow` reads the Actual Cost from that single `mapByCode[costCode.code]` instead of from `item.historical_project_id` / `item.historical_lot_id`.
- No migration of historical data. Possibly one tiny migration to add the two `historical_reference_*` columns on `projects` so the dropdown selection persists.