One-time data fix for bill `386880-070` on project 103E Oxford. No code, no emails. Reduce the bill (and its journal entry) by $0.01 so it matches PO `2026-103E-0009` ($40,504.13) and clears the "Over" status / $0.01 A/P remainder.

## Current state

- PO `2026-103E-0009` total: `$40,504.13` ✅ (already correct)
- Bill `386880-070` total: `$40,504.14` ❌ (off by $0.01)
  - Line 1 (lot 13fd5512…): amount `20252.07`, unit_cost `40504.13`
  - Line 2 (lot 6cb1523e…): amount `20252.07`, unit_cost `40504.14`
- Bill JE `85876a25…`: WIP debits 20252.07 + 20252.07 = 40504.14, AP credit `40504.14`
- Payment JE: AP debit `40504.13`, cash credit `40504.13` → leaves $0.01 stuck open in A/P

## Updates (one migration, all UPDATE statements)

1. `bills` (id `dea764ee-e624-4731-af47-3c1d392f4a98`)
   - `total_amount`: `40504.14` → `40504.13`
2. `bill_lines` line 2 (id `c6f908be-6582-485c-9f5c-28ca1dee5ece`)
   - `amount`: `20252.07` → `20252.06`
   - `unit_cost`: `40504.14` → `40504.12`
3. `journal_entry_lines` for JE `85876a25…`
   - WIP line `f106cc98-2572-4d5f-a82f-ead16830e71b` (lot 6cb1523e…): `debit` `20252.07` → `20252.06`
   - AP line `489a889c-5b70-47ac-a750-3ef6666a3478`: `credit` `40504.14` → `40504.13`

Line 1 (lot 13fd5512…) is left untouched; the penny is removed from line 2 so the bill is split 20252.07 / 20252.06.

After this, the bill, JE, payment, and PO all reconcile to `$40,504.13`, the "Over" badge clears, and A/P shows $0 remaining on this bill.
