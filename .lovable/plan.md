
Fix the Reports A/P mismatch by making the Accounts Payable report open in true project-total mode and only diverge when the user explicitly applies a lot filter.

What to change

1. Make the A/P report default to Total, not the first lot
- File: `src/components/reports/AccountsPayableContent.tsx`
- Initialize `selectedLotId` to `"__total__"` instead of `null`.
- Keep the existing lot-filter logic for intentional per-lot views, but ensure the first render is always the full project total.
- This makes the A/P report match the Balance Sheet 2010 balance and the A/P detail dialog by default.

2. Preserve the existing shared source of truth
- Keep `AccountsPayableContent` using the exact A/P account id from `accounting_settings.ap_account_id` / owner-specific `2010` fallback.
- Keep the same canonical journal-entry filters already used by Balance Sheet and `AccountDetailDialog`:
  - `entry_date <= asOfDate`
  - `is_reversal = false`
  - `reversed_by_id is null`
  - `reversed_at is null or reversed_at > asOfDate`
- No separate math path should be introduced.

3. Make filtered A/P views visibly obvious
- In `AccountsPayableContent`, add a clear label near the report total/header showing whether the page is:
  - `Total`
  - or a specific lot name
- This prevents a lot-filtered aging total from being mistaken for the full project A/P total.

4. Keep the reconciliation safeguard active for total mode
- Continue showing the G/L reconciliation warning when viewing `Total`.
- After the default changes to `Total`, that warning will correctly surface any true remaining data issue instead of hiding behind an auto-selected lot.

Files to update
- `src/components/reports/AccountsPayableContent.tsx`

Why this should fix the issue
- `ReportsTabs.tsx` already shares the same `asOfDate` across Balance Sheet and A/P.
- `AccountsPayableContent.tsx` currently auto-starts from a lot selection path because `selectedLotId` begins as `null` and `LotSelector` auto-selects the first lot.
- That means the A/P report can open on a lot-filtered subtotal while the Balance Sheet and A/P dialog are showing the full project total.

Verification
1. Open Reports → Balance Sheet with the chosen As Of date and note A/P.
2. Switch to Accounts Payable without touching any lot filter:
   - Grand Total must equal the Balance Sheet A/P amount exactly.
3. Open the A/P account detail dialog from the Balance Sheet:
   - Running balance total must match the same number.
4. Change the lot selector to a specific lot:
   - Total changes, and the UI clearly indicates it is a lot-filtered view rather than project total.
5. Export the A/P PDF from Total view:
   - PDF total matches on-screen A/P total and Balance Sheet A/P.
