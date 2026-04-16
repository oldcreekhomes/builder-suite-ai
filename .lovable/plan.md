

## Plan: Manual tab — single row layout, Notes column, and Add Row capability

### Issue 1 — Single row layout
The current Manual tab wraps because `Quantity` and `Unit Price` use `w-28` inputs inside a 7-column table inside a `max-w-3xl` dialog. Description "Public Housing Contributions" wraps to 2 lines.

Fix in `src/components/budget/BudgetDetailsModal.tsx`:
- Widen dialog from `max-w-3xl` to `max-w-5xl` (matches Vendor Bid / PO breathing room).
- Shrink number inputs from `w-28 h-8` to `w-24 h-8` and remove the `w-12` checkbox spacer column on Manual (no checkbox is used there).
- Add `whitespace-nowrap` to total cell.

### Issue 2 — Actions column with "Add Row" dropdown
Add a final `Actions` column with a 3-dot `MoreHorizontal` button (matches PO tab style) that opens a `DropdownMenu` containing **Add Row** (and **Delete Row** for non-primary rows).

Behavior of "Add Row":
- Inserts a new editable manual sub-line into the Manual tab UI directly below the clicked row.
- Each sub-line has its own Description, Notes, Unit Price, Quantity, Total.
- All sub-lines sum into the Manual total (and feed `manualTotalAmount`, which the existing per-lot allocation math already handles correctly).

### Issue 3 — Notes column
Insert a new `Notes` column between `Description` and `Unit Price` on the Manual tab, rendered as a small `<Input>` (same `h-8` size). Stored per sub-line.

### Storage approach (technical)

The existing `project_budgets` table has a `(project_id, lot_id, cost_code_id)` unique constraint, so we cannot store multiple manual sub-lines as additional rows in `project_budgets`. We also cannot use the existing `comment` column for multi-row data without breaking other consumers.

Create a new child table `project_budget_manual_lines`:
- `id uuid pk`
- `project_id uuid` (FK projects)
- `cost_code_id uuid` (FK cost_codes)
- `description text` (defaults to cost code name)
- `notes text null`
- `unit_price numeric`
- `quantity numeric default 1`
- `sort_order int`
- `owner_id uuid` (multi-tenant stamp per RLS standard)
- `created_at`, `updated_at`
- RLS: same `home_builder_id`-scoped policies used by `project_budgets`

Save behavior on Apply (Manual tab):
- Compute `manualTotalAmount` as the sum of all sub-lines.
- Persist sub-lines to `project_budget_manual_lines` (upsert + delete removed).
- Continue to write the aggregate into `project_budgets` exactly as today (per-lot split with cent-precise remainder when "Divide by N lots" is chosen, otherwise full amount on the row). This keeps Budget ↔ Job Costs mirror sync intact.

Reopen behavior:
- If `project_budget_manual_lines` rows exist for `(project_id, cost_code_id)`, hydrate the Manual tab from them (true source of truth — no reconstruction guesswork).
- Else fall back to the current sibling-sum reconstruction for legacy single-line manual entries.

### Files to change
- `src/components/budget/BudgetDetailsModal.tsx` — Manual tab layout, Notes column, Actions dropdown, sub-line state, hydration from new table, save logic.
- New migration — create `project_budget_manual_lines` table + RLS + indexes.
- `src/integrations/supabase/types.ts` — auto-regenerated.

### Out of scope
- No changes to PO, Vendor Bid, Estimate, Historical, Actual tabs.
- No changes to Job Costs report (it still reads from `project_budgets` aggregate).
- No changes to budget locking or header actions.

### Validation
1. Open Manual tab → row renders on a single line; inputs are compact.
2. Click 3-dot → Add Row → new editable sub-line appears with Notes field.
3. Enter values; total updates live; Apply saves.
4. Reopen modal → all sub-lines including notes reload exactly as entered.
5. Per-lot allocation still divides the combined total correctly (e.g. $142,626 ÷ 19).
6. Job Costs report shows the same combined total.

