
## Goal
Fix the Balance Sheet so that when you run it **“As of Dec 31, 2025”** for **115 E. Oceanwatch Ct**, the **1010: Atlantic Union Bank** balance matches the bank statement ending balance (**$55,487.17**) and the overall Balance Sheet totals remain correct.

## What I found (why it’s still off by exactly $7,007.20)
There is a real journal entry dated **12/15/2025** for **$7,007.20**:

- **JE**: `21f636fc-072a-4d60-aa83-9a9a8106c1d6`
- Lines:
  - **2010 Accounts Payable**: **Debit $7,007.20**
  - **1010 Atlantic Union Bank**: **Credit $7,007.20**
- It was later marked “reversed” on **01/21/2026** via `reversed_at`, but **no actual reversal entry exists** (`reversed_by_id` is NULL).

### The key bug in reporting logic
The Balance Sheet currently excludes any journal entry that has `reversed_at` set (or similar reversal flags), **even if the reversal happened after the report “as-of” date**.

That means:
- For **12/31/2025**, the $7,007.20 payment *should be included* (it happened in 2025).
- But because it was “reversed” in 2026, the current report logic excludes it, causing the Balance Sheet cash to be **too high by $7,007.20**.

This exactly matches your symptom:
- Report shows **$62,494.37**
- Bank statement shows **$55,487.17**
- Difference: **$7,007.20**

## Fix approach (code)
Update the Balance Sheet journal line query to be **as-of aware**:
- Keep filtering by `entry_date <= asOfDate`
- Change reversal filtering so entries are only excluded if they were reversed **on or before** the `asOfDate`
- Ensure we still protect against “zombie” reversed entries (like this one) for dates *after* 01/21/2026

### Desired behavior
- **As-of 2025-12-31**: include JE `21f...` → bank matches statement
- **As-of 2026-12-31**: exclude JE `21f...` (because it was reversed on 01/21/2026, and there is no reversal JE to offset it) → prevents phantom cash differences in later periods

## Implementation steps
1. **Locate the Balance Sheet query**
   - File: `src/components/reports/BalanceSheetContent.tsx`
   - Find the `journalLinesQuery` builder and current reversal filters (currently using conditions like `reversed_at is null`, `reversed_by_id is null`, and `is_reversal = false`).

2. **Adjust reversal logic to be time-aware**
   - Replace the unconditional exclusion (`reversed_at IS NULL`) with logic equivalent to:
     - Include if `reversed_at IS NULL` OR `reversed_at > asOfDate`
     - Additionally, handle records with `reversed_by_id` depending on your reversal model (see next point)

3. **Decide how to treat `reversed_by_id` entries in Balance Sheet**
   - Recommended for Balance Sheet correctness “as-of”:
     - Do **not** blanket-exclude entries just because they were later corrected (`reversed_by_id` set), because that breaks historical as-of reports.
     - Instead, rely on:
       - `entry_date <= asOfDate`
       - and inclusion of reversal entries where applicable (if they exist and have entry dates <= asOfDate)
   - In other words: Balance Sheet should be “what was true as-of that date”, not “current corrected view”.

4. **Update the PostgREST/Supabase filter expressions**
   - Implement the “as-of” reversal filter using Supabase `.or()` with the formatted date string.
   - Keep the project filter behavior as-is:
     - If `projectId` provided: `.eq('project_id', projectId)`
     - Else: `.is('project_id', null)`

5. **Verification checklist (in the UI)**
   - Open: Project → Accounting → Reports → Balance Sheet
   - Set date to **Dec 31, 2025**
   - Confirm:
     - **1010 Atlantic Union Bank = $55,487.17**
     - Balance Sheet still balances (Assets = Liabilities + Equity)
   - Also test:
     - “As of” a date **after 01/21/2026** to ensure that the zombie reversed entry does not reintroduce phantom differences.

## Optional (data hygiene, not required to fix the report)
That zombie JE (`21f...`) is a data integrity issue. After the report logic is corrected, we can optionally:
- Create a real reversal entry, or
- Remove/repair the orphaned entry in a controlled way,
so future reports and audit trails remain clean.

## Risks / edge cases
- If your system sometimes uses `reversed_by_id` without creating true reversal lines (or marks “reversed” without a corresponding reversal entry), then Balance Sheet needs special handling for those zombie cases (we will keep that protection in place using `reversed_at` compared to `asOfDate`).
- Job Costs reports may still want “current corrected” behavior (exclude reversed originals), but Balance Sheet generally must be “as-of accurate”. We’ll keep this change limited to Balance Sheet reporting logic.

## Deliverables
- Code update in `src/components/reports/BalanceSheetContent.tsx` to make reversal filtering **as-of date aware**, fixing the $7,007.20 discrepancy for 12/31/2025.
