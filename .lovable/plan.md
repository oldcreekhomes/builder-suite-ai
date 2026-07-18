## Goal

Populate the two empty parent groups in the 923 17th Street schedule by duplicating existing task lists — leaving the source groups untouched.

## Confirmed current state

Project `350e5951-1a6f-4809-9d4e-7652d58603b9` currently has:
- **9** — 2401 INTERIOR CONSTRUCTION (84 children: 9.1 → 9.84)
- **10** — 2401 EXTERIOR CONSTRUCTION (no children)
- **11** — 2405 INTERIOR CONSTRUCTION (no children)
- **12** — 2405 EXTERIOR CONSTRUCTION (18 children: 12.1 → 12.18)

## Changes

Run a single data insert against `project_schedule_tasks`:

1. Copy every row where `hierarchy_number` starts with `12.` into new rows with the same `project_id`, renumbered `10.1` … `10.18`. Copy all fields verbatim: `task_name`, `start_date`, `end_date`, `duration`, `progress`, `predecessor`, `resources`, `confirmed`, `notes`.
2. Copy every row where `hierarchy_number` starts with `9.` into new rows renumbered `11.1` … `11.84`, same field-for-field copy.

New rows get fresh `id`s and standard `created_at` / `updated_at`. Existing groups 9 and 12 (and their children) are not modified. Groups 10 and 11 parent rows remain in place.

## Verification

After the insert, re-query the four groups and confirm:
- Group 10 has 18 children (10.1 → 10.18) matching group 12's task names.
- Group 11 has 84 children (11.1 → 11.84) matching group 9's task names, dates, and notes.
