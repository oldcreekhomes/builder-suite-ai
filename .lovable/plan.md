# Fix: Price History modal overwrote the current price

## What happened

Cost code 4670.3 (Engineered Hardwood - Labor Only) now reads **$2.00**, and its only history row is the 1/1/2023 $2.00 entry. The $2.20 price is gone.

Cause, confirmed in the database: the Price History modal runs an "auto-sync" every time it opens. It takes the most recent **history** row and writes that price back onto the cost code — regardless of whether the cost code's own price is newer. When the backdated 1/1/2023 $2.00 row was added, the next open of the modal stamped $2.00 over the live $2.20 (cost code `updated_at` = 14:19:21 today, immediately after the history row was created at 14:18:55).

There is also no history row for the $2.20 increase, so the increase was never recorded as history — only the `price` field on the cost code changed.

## The fix

1. **Stop the destructive auto-sync.** The modal is a read-only report; it should not write prices. Remove the write-back entirely (and its "Price updated" toast). If any sync is still wanted, it will only ever run when the newest history row is genuinely newer than the cost code's `updated_at` — never backwards from a backdated entry.
2. **Restore the data:** set 4670.3 back to **$2.20**, and insert a history row of **$2.20 dated today (8/26/2026)** so the chart shows the real $2.00 → $2.20 step.
3. **Record future increases as history.** Where cost code prices are edited, write a matching `cost_code_price_history` row so the chart reflects every change. This is the reason the $2.20 increase left no trace.

## Result

4670.3 shows $2.20 current, history of $2.00 (1/1/2023) → $2.20 (8/26/2026), total change +10.0%, annual change about +2.7%/yr — and opening the modal no longer changes any price.

## Technical notes

- `src/components/settings/PriceHistoryModal.tsx`: delete the auto-sync block in `fetchPriceHistory` (the `cost_codes` update, related toasts, `skipAutoSync` handling).
- Data repair via SQL: update `cost_codes.price` for 4670.3 to 2.20 and insert the corresponding `cost_code_price_history` row.
- Audit the cost code edit/save path in settings to confirm it inserts a history row on every price change; add it if missing.
