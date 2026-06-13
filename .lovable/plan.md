# Consolidate 1639 N Woodstock — Lot 2 → Lot 1

## Goal
Reassign every transaction currently allocated to **Lot 2** on project `1639 N Woodstock St` so it lives under **Lot 1** instead. After this runs, you can delete Lot 2 from Edit Project with no orphaned data.

## Project & lots
- Project: `23f2f6db-c6a1-41f7-aa28-9d290cc7b420` — 1639 N Woodstock St
- Lot 1 (target): `5838c68d-08c5-4093-a014-44a75afce287`
- Lot 2 (source, to be emptied): `c2e0c8d1-9bb6-4bd5-a1b4-8cfb0c3bf3cf`

## Rows currently on Lot 2
| Table | Rows |
|---|---|
| bill_lines | 4 |
| check_lines | 1 |
| deposit_lines | 2 |
| journal_entry_lines | 13 |
| bills | 0 |
| credit_card_lines | 0 |
| pending_bill_lines | 0 |
| project_budgets | 0 |
| project_purchase_orders | 0 |
| recurring_transaction_lines | 0 |

Total: **20 line rows** to be re-pointed. No budgets, POs, or pending bills sit on Lot 2, so nothing else needs reconciling.

## What I'll do (one migration)
A single SQL migration that does, for the affected tables:
```sql
UPDATE <table> SET lot_id = '<lot1>' WHERE lot_id = '<lot2>';
```
applied to: `bill_lines`, `check_lines`, `deposit_lines`, `journal_entry_lines`.

Dollar totals on Balance Sheet / Job Costs / Bank Register / Account Detail won't change — only the lot attribution flips from Lot 2 to Lot 1. Audit columns auto-stamp via the existing trigger.

## After the migration
Lot 2 will have zero references. You can then open Edit Project → Lots / Addresses → ⋯ on Lot 2 → Delete, and it will remove cleanly.

I'll leave the actual delete of Lot 2 to you, as you asked.
