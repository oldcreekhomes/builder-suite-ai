# Employee Activity — time-bucket breakdown + saner counts

## Part 1 — Why Matt shows 18,629

The RPC counts every `created_by`/`updated_by` stamp across all audited tables. For Matt (owner) over 30 days:

- `journal_entry_lines` updates: 6,528
- `journal_entries` updates: 2,605
- `bill_lines` updates: 2,398
- `pending_bill_lines` updates: 967
- `journal_entry_lines` creates: 1,178
- `bill_lines` creates: 876
- `pending_bill_lines` creates: 727
- `bill_categorization_examples` creates: 717
- `check_lines` updates: 511
- … plus ~50 smaller tables

Each posting/payment/reconciliation cascades into many line-row stamps. One click = many "actions". Owners do most posting → owners look 10× more active than they are.

## Part 2 — Fix counting (parent-only)

In `get_employee_activity_summary`, **stop counting child line tables** so one bill = one bill action, one JE = one JE action:

Excluded from counting (kept implicit via parent):
- `bill_lines`, `bill_payments`, `bill_attachments`, `pending_bill_lines`
- `journal_entry_lines`, `journal_entry_attachments`
- `check_lines`, `deposit_lines`
- `project_budget_manual_lines`, `budget_subcategory_selections`
- `bill_categorization_examples` (system-generated learning artifact, not a user action)

Counted (parents only):
- Bills: `bills`, `pending_bill_uploads`
- POs: `project_purchase_orders`, `project_bid_packages`
- Bids: `project_bids`
- JEs: `journal_entries`
- Files: `project_files`, `project_folders`
- Budgets: `project_budgets`
- Schedule: `project_schedule_tasks`
- Photos: `project_photos`
- Chat: `user_chat_messages`
- Checks/Deposits roll into JEs visually (no new column needed)

Expected effect: Matt drops from ~18.6K to roughly 1–2K; Jole Ann's relative ranking should rise.

## Part 3 — Time-bucket breakdown in expandable row

Extend the RPC with per-bucket totals and per-domain counts using the existing `tmp_acts` scan:

- 4 totals: `actions_8h`, `actions_24h`, `actions_7d`, `actions_30d`
- 9 domains × 4 buckets = 36 cells (e.g. `bills_8h`, `bills_24h`, `bills_7d`, `bills_30d`, …)

Computed via `COUNT(*) FILTER (WHERE ts >= now() - interval 'X' AND source IN (...))`. Single pass — no extra cost.

Collapsed row stays unchanged (`total_actions` still equals 30d bucket).

### UI (`EmployeeActivitySection.tsx`)

Replace the 9-tile grid in the expanded row with a compact matrix:

```text
              8h    24h    7d    30d
Bills          0      2    11     34
POs            0      0     3     12
Bids           0      1     4      9
JEs            0      0     7     22
Files          …
Budgets        …
Schedule       …
Photos         …
Chat           …
─────────────────────────────────────
Total          0      3    25     77
```

- shadcn `<Table>`, sticky first column, right-aligned `tabular-nums`, muted zeros
- Bottom total row, divider above

`useEmployeeActivity.ts`: add the 40 new typed fields.

## Files

- `supabase/migrations/<new>.sql` — recreate `get_employee_activity_summary` (parent-only sources + 40 bucket columns), still `VOLATILE SECURITY DEFINER`
- `src/hooks/useEmployeeActivity.ts` — extend `EmployeeActivityRow`
- `src/components/owner-dashboard/EmployeeActivitySection.tsx` — bucket matrix in expanded row
