# Fix Oceanwatch Job Costs: all costs belong to its one lot

## What's wrong
Oceanwatch has only 1 lot, but 390 cost entries (214 bill lines) were saved with no lot. Since my last change, a lot report shows only costs tagged to that lot, so Lot 1 shows $0 on things like 2440 Land Carrying and 1010 Lot Costs. The whole-job total was never wrong.

## Fix
1. **Data (Oceanwatch only first, then every 1-lot job):** tag every untagged job-cost line (bills, checks, deposits, credit cards, journal entries) to the job's single lot. Amounts, dates, closed months and reconciled status are not changed — only the lot tag.
2. **Report safety net:** on any job with exactly one lot, the Job Costs report (screen, PDF, emailed) counts untagged costs on that lot, so this can't reappear. Multi-lot jobs keep the "Unassigned" group.
3. **Check:** Oceanwatch Lot 1 total equals the whole-job total for every cost code; 0 untagged lines left.

## Technical details
- SQL transaction updating `lot_id` where `lot_id is null` and line is job cost, for projects with exactly 1 `project_lots` row.
- `src/lib/jobCostLotAllocation.ts`: when lot count = 1, merge unassigned into assigned; add a test.
