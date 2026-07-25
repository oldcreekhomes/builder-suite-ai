## Fix: Correct JE dates for 3 misdated March checks

Update `journal_entries.entry_date` from Feb 27–28, 2026 to **March 1, 2026** for the 3 journal entries tied to these checks (all dated 3/1/2026 in the `checks` table):

- Check `f45a2f80…` — $140.55
- Check `949ae658…` — $103.52
- Check `a24914a7…` — $15.54

Total corrected: **$259.61**

### Steps
1. Run an UPDATE on `journal_entries` setting `entry_date = '2026-03-01'` for the JEs linked to those 3 check IDs (scoped by `source_type='check'` and `source_id IN (...)` to be surgical).
2. Verify: query the 3 rows post-update to confirm dates are 3/1/2026.
3. Confirm Balance Sheet as of 2/28/2026 now shows Atlantic Union Bank = **$36,933.39** (matches statement).

### Not in scope (yet)
- No code changes. If you want, as a follow-up I can audit the check-creation path to ensure JE `entry_date` is always stamped from `checks.check_date` so this can't recur.
