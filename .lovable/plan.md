
## Resize Job Cost Table Columns in Edit Extracted Bill Dialog

### What the User Wants

From the screenshot and voice notes, the table still feels cramped. The user wants:

1. **Quantity** — reduce by 25% (currently 70px → 52px, rounded to **52px**)
2. **Unit Cost** — reduce by 25% (currently 100px → **75px**)
3. **Total** — reduce (currently 100px, has lots of whitespace → **80px**)
4. **Address** — increase so the lot name is actually readable (currently 80px, cramped showing "Lo..." → match Purchase Order width)
5. **Cost Code, Memo, Quantity, Unit Cost, Address** — all made the same width as Purchase Order (`180px`)

Combining rules 1/2/3 with rule 5: rule 5 (match PO = 180px) overrides the percentage reductions for those columns, since the user's final explicit instruction is to make them match PO size. The only columns that don't get 180px are Total (reduce to ~80px), Match (stays 55px), and Actions (stays 50px).

### Resulting Column Widths

```text
Cost Code:      180px   (was 180px — no change, already matches PO)
Memo:           180px   (was 120px — increase to match PO)
Quantity:       180px   (was 70px — increase to match PO)
Unit Cost:      180px   (was 100px — increase to match PO)
Total:          80px    (was 100px — reduced per user request)
Address:        180px   (was 80px — increase to match PO and be readable)
Purchase Order: 180px   (unchanged — the reference width)
Match:          55px    (unchanged)
Actions:        50px    (unchanged)
```

Total (with address + PO columns): 180+180+180+180+80+180+180+55+50 = **1,265px**

The dialog already has `overflow-x-auto` on the table container so horizontal scrolling will handle any overflow gracefully.

### File Changed

**`src/components/bills/EditExtractedBillDialog.tsx`** — lines 1012–1016 and 1017:
- `Cost Code`: keep at `w-[180px]`
- `Memo`: `w-[120px]` → `w-[180px]`
- `Quantity`: `w-[70px]` → `w-[180px]`
- `Unit Cost`: `w-[100px]` → `w-[180px]`
- `Total`: `w-[100px]` → `w-[80px]`
- `Address`: `w-[80px]` → `w-[180px]`

No logic changes — purely column width adjustments.
