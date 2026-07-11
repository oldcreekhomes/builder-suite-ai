## Add Description column + Cost Code to Reconciliation Review dialog

**File:** `src/components/transactions/ReconciliationReviewDialog.tsx` (only file changed)

### 1. Extend `ClearedTransaction` type
Add two optional fields: `description?: string` and `costCode?: string`.

### 2. Pull description + cost code data per transaction type

- **Checks**: fetch `check_lines` (memo, cost_code_id) for the reconciliation's check IDs, plus join `cost_codes` (code + name). Description = check's `memo`, or fallback to the first line's `memo`. Cost code = distinct `cost_codes.code - name` values across the check's lines, joined with `, ` (or `Multiple` if >2).
- **Bill payments** (both JE-line path and legacy path): fetch `bill_lines` (memo, cost_code_id) for the involved bill IDs, plus `cost_codes`. Description = bill's `notes`, or fallback to the first bill line's `memo`. Cost code = same aggregation rule as checks.
- **Deposits**: fetch `deposit_lines` memo for description (skip cost code — deposits are income).
- **Manual JE lines**: description already comes from `line.memo`; add cost code by including `cost_code_id` in the select and joining to `cost_codes`.

### 3. Table changes

**Checks & Bill Payments Cleared table** — new column order:
`Date | Type | Payee | Description | Reference | Cost Code | Amount`

**Deposits Cleared table** — add a `Description` column between `Source` and `Amount` (no cost code column, deposits don't carry one).

Truncate long descriptions with `max-w-[220px] truncate` and a `title` attribute for hover full text so the row height stays fixed.

### 4. No schema/DB/edge-function changes

Purely a UI + query fields expansion inside this one dialog. Everything else (dashboard, list dialog, reconciliation logic) stays exactly as it is now.
