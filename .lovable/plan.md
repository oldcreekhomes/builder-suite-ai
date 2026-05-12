## Employee Activity: track every meaningful action

**Goal:** Status badge ("Active now / today / yesterday") must reflect the user's true last action — including chat messages, photo uploads, and any edit (not just inserts).

### Rule

**Any row a user creates OR updates anywhere in the `public` schema counts as activity.**

Implementation = dynamic discovery, no hardcoded table list:

1. Loop `information_schema.columns` for every public table.
2. For each table that has `created_by` + `created_at` → count inserts.
3. For each table that **also** has `updated_by` + `updated_at` → count edits (only when `updated_at <> created_at` to avoid double-counting the initial insert).
4. Plus one explicit non-`created_by` source: `user_chat_messages.sender_id` → chat.

This means schedule edits (rename, start/end/duration, drag, reassign), bill edits, PO edits, budget edits, photo uploads, folder renames, etc. all register automatically — and any future table picks it up the day it's created, as long as it follows the project's `set_audit_user()` audit-stamping convention.

### Migration

Drop & recreate `public.get_employee_activity_summary(timestamptz, timestamptz)`:

- Same SECURITY DEFINER + tenant + `can_access_employees` permission gate.
- Build activity rows in plpgsql via dynamic SQL:
  ```sql
  FOR rec IN
    SELECT table_name,
           BOOL_OR(column_name='updated_by') AS has_upd_by,
           BOOL_OR(column_name='updated_at') AS has_upd_at
    FROM information_schema.columns
    WHERE table_schema='public'
      AND column_name IN ('created_by','created_at','updated_by','updated_at')
    GROUP BY table_name
    HAVING BOOL_OR(column_name='created_by')
       AND BOOL_OR(column_name='created_at')
  LOOP
    EXECUTE format($f$
      INSERT INTO tmp_acts(uid, ts, source, kind)
      SELECT created_by, created_at, %L, 'create'
      FROM public.%I
      WHERE created_by IS NOT NULL
        AND created_at BETWEEN $1 AND $2
    $f$, rec.table_name, rec.table_name) USING p_start_date, p_end_date;

    IF rec.has_upd_by AND rec.has_upd_at THEN
      EXECUTE format($f$
        INSERT INTO tmp_acts(uid, ts, source, kind)
        SELECT updated_by, updated_at, %L, 'update'
        FROM public.%I
        WHERE updated_by IS NOT NULL
          AND updated_at BETWEEN $1 AND $2
          AND updated_at <> created_at
      $f$, rec.table_name, rec.table_name) USING p_start_date, p_end_date;
    END IF;
  END LOOP;

  -- Chat (no created_by column)
  INSERT INTO tmp_acts SELECT sender_id, created_at, 'user_chat_messages', 'create'
  FROM public.user_chat_messages
  WHERE created_at BETWEEN p_start_date AND p_end_date;
  ```
- Restrict to caller's tenant users (`id = caller_tenant OR home_builder_id = caller_tenant`).
- Aggregate per user → `last_action`, `total_actions`, plus grouped breakdown counts.

### Returned breakdown columns (UI tiles)

Same shape as today, with two additions:

| Tile | Sources rolled in |
|---|---|
| Bills | bills, bill_lines, bill_payments, bill_attachments, pending_bill_uploads, pending_bill_lines |
| POs | project_purchase_orders, project_bid_packages |
| Bids | project_bids |
| JEs | journal_entries, journal_entry_lines, journal_entry_attachments |
| **Photos** *(new)* | project_photos |
| Files | project_files, project_folders |
| Budgets | project_budgets, project_budget_manual_lines, budget_subcategory_selections |
| Schedule | project_schedule_tasks (creates **and** updates) |
| **Chat** *(new)* | user_chat_messages |
| Other | catch-all so totals always reconcile |

### Frontend

- `src/hooks/useEmployeeActivity.ts`: add `chat_count` and `photos_count` to `EmployeeActivityRow`.
- `src/components/owner-dashboard/EmployeeActivitySection.tsx`: add Chat + Photos tiles to the expanded breakdown grid (`lg:grid-cols-9` or wrap to 2 rows).

### Status bucketing

No change — the badges added in the last edit (Active now / today / yesterday / this week / Idle 30d / Inactive) now reflect the true last action across every table.

### Notes

- Performance: ~65 dynamic queries per call, each bounded to 30 days and `created_by IS NOT NULL`. Acceptable for an admin-only widget; can be cached server-side later if needed.
- Tables without `created_by` (junction/child tables like `purchase_order_lines`, `bill_payment_allocations`) are intentionally skipped — their parent row's `updated_at` already captures the action.
