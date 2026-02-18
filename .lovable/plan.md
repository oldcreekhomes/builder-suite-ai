
## Fix Column Widths — Job Cost Table in Edit Extracted Bill Dialog

### The Problem

The previous edit incorrectly set Quantity, Unit Cost, and Address all to `180px` — matching Purchase Order — when the user only wanted Cost Code and Memo at that width. Quantity, Unit Cost, and Address are all much narrower by nature and don't need 180px.

### Requested Changes (from screenshot + voice)

| Column | Current | New | Reason |
|---|---|---|---|
| Cost Code | 180px | 220px | More room to read code + name |
| Memo | 180px | 220px | More room to read memo text |
| Quantity | 180px | 70px | Just a number (1, 2, 3…) |
| Unit Cost | 180px | 90px | Currency value — compact |
| Total | 80px | 80px | Keep as-is |
| Address | 180px | 90px | 50% of current 180px |
| Purchase Order | 180px | 180px | Unchanged |
| Match | 55px | 55px | Unchanged |
| Actions | 50px | 50px | Unchanged |

Total estimate (with address + PO): 220+220+70+90+80+90+180+55+50 = **1,055px** — fits comfortably.

### File Changed

**`src/components/bills/EditExtractedBillDialog.tsx`** — lines 1012–1017:
- `Cost Code`: `w-[180px]` → `w-[220px]`
- `Memo`: `w-[180px]` → `w-[220px]`
- `Quantity`: `w-[180px]` → `w-[70px]`
- `Unit Cost`: `w-[180px]` → `w-[90px]`
- `Address`: `w-[180px]` → `w-[90px]`

No logic changes — purely column width adjustments.
