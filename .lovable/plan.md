

## Add $7,700 Price History Entry for Staging (2560)

Two data operations — no code changes needed:

1. **Insert a price history record** into `cost_code_price_history`:
   - cost_code_id: `46447250-c06c-435f-8ec2-ac1908297de2`
   - price: `7700`
   - changed_at: `2025-12-12`
   - owner_id: `2653aba8-d154-4301-99bf-77d559492e19`

2. **Update the cost code's current price** on `cost_codes` to `7700` (since this will be the most recent/only history entry, matching how the UI syncs the price after adding history).

After this, the Price History graph for 2560 - Staging will show a $7,700 data point at 12/12/2025, and the current price will read $7,700.

