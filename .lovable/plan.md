# Fix Edit Bill date off-by-one

## Problem
The bills table shows the correct bill/due dates from the database (e.g. 03/19/26 and 04/18/26), but the Edit Bill dialog displays them one day earlier (03/18 and 04/17). Saving the dialog would also drift the dates further.

## Root Cause
In `src/components/bills/EditBillDialog.tsx`:
- Lines 206–207 parse the stored `YYYY-MM-DD` date with `new Date(billData.bill_date)`. JavaScript interprets that string as UTC midnight, which renders as the previous day in any negative-UTC timezone (US time zones).
- Lines 582–583 (and 621) serialize back with `billDate.toISOString().split('T')[0]`, which converts local midnight to a UTC date — shifting the saved date back another day.

The project already has timezone-safe helpers in `src/utils/dateOnly.ts` (`toDateLocal`, `normalizeToYMD`) used elsewhere; this dialog isn't using them.

## Fix
Edit only `src/components/bills/EditBillDialog.tsx`:

1. Import `toDateLocal` and `normalizeToYMD` from `@/utils/dateOnly`.
2. Replace `new Date(billData.bill_date)` with `toDateLocal(normalizeToYMD(billData.bill_date))` (and the same for `due_date`) when seeding state from the loaded bill.
3. Replace every `billDate.toISOString().split('T')[0]` / `billDueDate?.toISOString().split('T')[0]` with `normalizeToYMD(billDate)` / `billDueDate ? normalizeToYMD(billDueDate) : undefined` when writing back to Supabase.

No schema or data changes — the DB already holds the correct dates (`2026-03-19` / `2026-04-18`). This purely corrects the dialog's local timezone handling so the dialog matches the table.
