# Add cost codes to the 6119 invoice list (no app changes)

Make a new version of the spreadsheet, `6119-11th-St-N-invoice-list_v2.csv`. The original stays as it is.

## What changes
- New **Cost Codes** column showing each bill's cost code(s) with name, e.g. `2055: Surveying`.
- Bills split across several cost codes list all of them in that cell, each with its amount, e.g. `2240: Legal ($300.00); 2055: Surveying ($186.37)`.
- Lines with no cost code (account-only expense lines) show the account instead, e.g. `8270: Office Supplies`.
- Everything else stays the same: one row per bill/file, same columns, same order.

## Not changing
- No app code and no data edits. This only reads data.

## Technical details
- Join `bill_lines` → `cost_codes` (fall back to `accounts`) for project `a50ae540-...`, aggregate per bill with `string_agg`, and save to /mnt/documents as v2.
