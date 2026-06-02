## What I found in the PDF for Lot 506

The PDF uses slightly different codes than your chart of accounts, so I mapped by name (per "the words are the same"):

| PDF code | PDF amount | Your code | Currently in budget |
|---|---|---|---|
| 4020 - Drawings | $68.21 | 2180 Drawings | $200.79 (wrong) |
| 4030 - Signage | $115.98 | 4060 Signage | $115.99 |
| 4040 - Temporary Toilets | $319.61 | 4070 Temporary Toilets | $319.60 |
| 4100 - Dumpsters | $1,871.78 | 4100 Dumpsters | $1,871.77 |
| 4200 - Excavation, Backfill & Grading | $5,924.28 | 4200 Excavation | **missing** |

### About 4200

There is **no `project_budgets` row** for 4200 on this lot — that's why the budget column is $0. The $5,924.28 you see in **Act. Cost** is coming from posted bills/journal entries against cost code 4200 (job-cost roll-up), which is independent of `project_budgets`. The two columns don't have to match; the budget side just needs to be added.

### Note on Drawings

The PDF actually has **two** "Drawings" rows: `2180 - Drawings $18.47` (under Soft Costs) and `4020 - Drawings $68.21` (under Homebuilding). Your chart of accounts only has one Drawings code (2180), so both PDF amounts have to land there. Your message only mentions $68.21, so I'll need you to pick:

- **Option A:** Set 2180 Drawings = **$86.68** (combine both PDF entries — total project drawings).
- **Option B:** Set 2180 Drawings = **$68.21** (only the 4020 amount, ignore the $18.47).

## Proposed data migration (Lot 506, project `691271e6…`, lot `eed5fd66…`)

Update existing `project_budgets` rows:

- **2180 Drawings** → unit_price = `86.68` or `68.21` (pending your choice)
- **4060 Signage** → unit_price = `115.98`
- **4070 Temporary Toilets** → unit_price = `319.61`
- **4100 Dumpsters** → unit_price = `1871.78`

Insert new row:

- **4200 Excavation, Backfill & Grading** → quantity `1`, unit_price `5924.28`, `budget_source='manual'`

All other rows untouched. Project grand total will increase by $5,924.28 (plus the Drawings correction).

Please confirm Option A or B for Drawings and I'll run the migration.
