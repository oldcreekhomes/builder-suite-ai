
## Increase Unit Cost Column Width

### The Problem
The Unit Cost column is currently `90px`, which truncates values like "$605.26" to "605." — the decimal and cents are cut off.

### Fix
Increase **Unit Cost** from `w-[90px]` → `w-[120px]`.

All other columns stay the same:
- Cost Code: 220px
- Memo: 220px
- Quantity: 70px
- Unit Cost: **90px → 120px**
- Total: 80px
- Address: 90px
- Purchase Order: 180px
- Match: 55px
- Actions: 50px

New total: 220+220+70+120+80+90+180+55+50 = **1,085px** — still fits with horizontal scroll.

### File Changed
**`src/components/bills/EditExtractedBillDialog.tsx`** — one line:
- `Unit Cost`: `w-[90px]` → `w-[120px]`
