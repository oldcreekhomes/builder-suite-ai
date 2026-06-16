Cause: the 4 projects in the screenshots are assigned to Erica as Accounting Manager, but their status is `Completed`. The Accounting Alerts hook currently excludes `Completed`, `Template`, and `Permanently Closed`, so those completed projects are intentionally filtered out before the card renders. QuickBooks is not the reason.

Plan:
1. Update Accounting Alerts project filtering so Erica sees projects where she is the accounting manager unless they are `Template` or `Permanently Closed`.
2. Keep QuickBooks, Builder Suite, and Other projects included the same way.
3. Update the empty-state text from “No active projects” to a neutral “No projects” so it matches the new behavior.
4. Leave billing/count/date logic unchanged so the card still shows Current, Late, and Approved exactly as it does now.

Technical detail:
- Change `src/hooks/useAccountingManagerBills.ts` from excluding `Completed` projects to only excluding `Template` and `Permanently Closed`.
- Change `src/components/ProjectWarnings.tsx` empty-state copy only.
- No database changes are needed.