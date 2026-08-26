# Add historical price for 4670.3

Add a past price entry for cost code **4670.3 — Engineered Hardwood - Labor Only** dated **01/01/2023** at **$2.00**.

## Current state
- Cost code 4670.3 exists with a current price of $2.20.
- It has no price history entries at all today.

## What will happen
- A price history record is added: $2.00, dated 01/01/2023, note "Historical price".
- The cost code's current price stays **$2.20**, because the 2023 entry is older than the current price. (The app normally syncs the current price to the most recent history entry — since there are no other entries, the sync is skipped intentionally so the displayed price does not drop to $2.00.)

## Technical notes
- Single insert into `cost_code_price_history` with `cost_code_id`, `price = 2.00`, `changed_at = 2023-01-01`, `owner_id` copied from the cost code.
- No code changes; data-only.
