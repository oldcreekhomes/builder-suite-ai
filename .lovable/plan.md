# Change 7 OCH equity checks to 11/05/2026

The 7 checks from OCH Checking at 228 S Washington (Custis $6,000, Oxford $49,000, Longfellow $2,000, Woodstock $8,000, Granada $6,000, 11th Street $3,000, Princess $15,000 = $89,000) are dated 10/05/2026.

## What changes
- Check date on all 7 checks: 10/05/2026 -> 11/05/2026.
- Date on each check's matching accounting entry, so the Balance Sheet, Write Checks, bank register, and reconciliation all show 11/05/2026.
- Amounts, accounts, and descriptions stay the same. No code changes.

## Technical details
- `UPDATE checks SET check_date='2026-11-05'` for the 7 ids found (pay_to 'OCH at ...', date 2026-10-05).
- `UPDATE journal_entries SET entry_date='2026-11-05'` for their 7 linked entries (source_id = check id).
- Confirm neither October nor November is a closed period first; verify afterwards by re-querying.
