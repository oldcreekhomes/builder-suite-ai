## Delete price history for cost code 4395

Code 4395 (Window & Door Install) now has subcategories 4395.1 and 4395.2 tracking prices, so the parent's price history is no longer needed.

**What will be deleted (your tenant only, owner `2653aba8...`):**
- 2 rows in `cost_code_price_history` for cost_code_id `910be8f1-71d8-46ad-99cd-57f84cf7d140`:
  - $2,500.00 — "Initial price at cost code creation" (2025-06-23)
  - $74.00 (2026-05-27)

Children 4395.1 and 4395.2 have no history rows and are untouched. Another tenant's 4395 row is not affected.

**SQL:**
```sql
DELETE FROM cost_code_price_history
WHERE cost_code_id = '910be8f1-71d8-46ad-99cd-57f84cf7d140';
```
