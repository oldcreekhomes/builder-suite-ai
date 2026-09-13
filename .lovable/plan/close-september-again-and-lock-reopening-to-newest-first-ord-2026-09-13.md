# Close September again and lock reopening to newest-first order

## What's happening

At 413 E Nelson Ave, the September 30, 2025 period was reopened even though five newer periods (March through July 2026) are still closed. Reopening an old period while newer ones stay closed leaves the books inconsistent.

## 1. Immediate fix (data)

Set the September 30, 2025 period back to Closed: restore its closed status, clear the reopen timestamp/reason, and keep the original closure note ("MG - Closed books on 11/3/25"). No transactions or journal entries are touched.

## 2. Enforce newest-first reopening

Rule: only the most recent closed period can be reopened. After it is reopened, the next most recent becomes eligible, and so on.

- In the Accounting Periods list, the Reopen button stays active only on the newest closed period. On every older closed period it is disabled with a short hint explaining that the newer period must be reopened first.
- The reopen action itself re-checks the rule before saving, so it can't be bypassed by a stale screen.

## 3. Error message

If a reopen is attempted out of order, show an error: "You must reopen periods newest first. Reopen [date of the newest closed period] before this one."

## Technical notes

- Data fix via SQL update on `accounting_periods` row `8412b28c-9d44-40cc-af9c-bd6b219f9293`: `status='closed'`, `reopened_at=null`, `reopened_by=null`, `reopen_reason=null`.
- `src/hooks/useAccountingPeriods.ts`: in `reopenPeriodMutation`, fetch the project's closed periods, find the max `period_end_date` with `status='closed'`, and throw the ordering error unless the target period is that row. Existing error toast surfaces the message.
- `src/components/accounting/CloseBooksPeriodManager.tsx`: compute the newest closed period from `periods` and disable Reopen on all other closed rows, with a tooltip/inline hint.
- Guard is scoped per project, matching how periods are already queried.
