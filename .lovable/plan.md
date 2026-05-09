## Goal

Populate the **859 N Lexington, Arlington, VA 22205** project (already exists, status: Completed) with historical actual costs from your `Lexington.xlsx`, so it appears as a selectable option in the Historical dropdown on every other project's Budget page (just like 412 E Nelson, 895 Kentucky St, etc.).

This is a **data-only change** — no code edits, no schema changes.

## What I'll do

For project `859 N Lexington` (id `1c577aa1-…`), write `actual_amount` values into the existing `project_budgets` rows (and insert new rows where the cost code isn't already in that project's budget), with `lot_id = null`.

All 88 line items from your spreadsheet have been matched to your current cost codes **by name** (the spreadsheet's code numbers are stale QuickBooks numbers — your live chart of accounts uses different numbers for some items, so name-matching is required). The spreadsheet total of **$1,728,032.30** reconciles exactly.

### Per-series totals to be posted

| Series | Lines | Total |
|---|---|---|
| 1000 Land Acquisition | 2 | $798,502.39 |
| 2000 Soft Costs | 16 | $276,572.09 |
| 3000 Site Development | 7 | $37,395.00 |
| 4000 Homebuilding | 63 | $615,562.82 |
| **Grand total** | **88** | **$1,728,032.30** |

### Notable name → code mappings (where spreadsheet code ≠ live code)

- `Office Supplies` $373.72 → **4040** (per your direction; absorbs 4010.2)
- `Project Manager` $52,289.95 → **4020** (per your direction; absorbs 4010.4)
- `Accounting` $1,365.11 → **4025** (per your direction; absorbs 4010.5)
- `Temporary Toilets` $1,069.12 → **4070** (spreadsheet showed 4040)
- `Gas Fireplace` $1,850 → **4540 Fireplace**
- `Hardwood (Includes shoe mold)` $25,020.41 → **4670 Hardwood**
- `Sales Commissions` $57,250 → **2580 Sales Commission**
- The parent `4010 General Conditions` total ($54,028.78) is **NOT** posted to 4010 itself — it's split into 4040 / 4020 / 4025 as you specified, so no double-counting.

`Powerwashing` ($0) will be skipped.

## How it shows up

After this runs, every project's Budget page will show **`859 N Lexington`** in the Historical dropdown (alongside 415 E Nelson, 895 Kentucky St, 1712 N Quebec St, 6330 Stevenson Ave – Lot 501/507). Selecting it pulls the actual amounts shown above into the Historical column for matching cost codes.

## Out of scope

- No changes to the cost code list
- No changes to the Budget UI or Historical dropdown logic
- No journal entries, bills, POs, or GL impact (per the existing "Historical Job Costs Data Source" pattern: these are static `actual_amount` values, not derived from JEs)
- No edits to any other project

## Technical notes

- Table: `project_budgets`, scoped by `project_id = 1c577aa1-f86c-418f-bdc7-768463664849`, `lot_id = null`
- 88 upserts (UPDATE existing rows where `(project_id, cost_code_id, lot_id)` already exists; INSERT otherwise)
- Will be executed via the data insert tool (no migration needed — no schema change)
