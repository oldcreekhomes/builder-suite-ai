

## Restore $200 Price History Entry for Cost Code 4275.7

### What happened
The original $200 price entry for cost code 4275.7 ("Concrete Pier - 12\" x 24\"") was lost. Only the recent $250 entry from today remains.

### What we'll do
Insert a single record into `cost_code_price_history`:
- **cost_code_id**: `7a243761-6df5-4733-a244-729344e7b365`
- **price**: $200
- **changed_at**: October 25, 2025
- **owner_id**: `2653aba8-d154-4301-99bf-77d559492e19`

### Result
The price history will show two entries:
1. Oct 25, 2025 -- $200 (restored)
2. Feb 26, 2026 -- $250 (current)

The current cost code price stays at $250 (most recent entry), which is correct.

### Technical details
Single INSERT into `cost_code_price_history` using the data insert tool. No code or schema changes needed.
