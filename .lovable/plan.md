
## Fix Column Widths in Edit Extracted Bill Dialog

### What the User Wants (from the screenshot and voice notes)

The table is cramped after the Address column was added. Four specific fixes are needed:

1. **Memo** — restore to a larger width (it was flexible/unconstrained before; adding the Address column squeezed it to almost nothing showing only "ab")
2. **Quantity** — reduce its width to reclaim horizontal space
3. **Address** — reduce by half (currently `w-[160px]` → `w-[80px]`)
4. **Accuracy** — it's going off-screen / invisible because the table is too wide; rename it to something shorter. The user rejected "Confidence" as too long. Best short option: **"Match"** (5 chars, clearly means "how well the AI matched this line to a PO")

### Current Column Widths

```text
Cost Code:      w-[200px]
Memo:           (no width — fills remaining space, but now squeezed)
Quantity:       w-[100px]
Unit Cost:      w-[120px]
Total:          w-[120px]
Address:        w-[160px]   ← NEW, too wide
Purchase Order: w-[200px]
Accuracy:       w-[80px]    ← going off-screen
Actions:        w-[50px]
```

### Proposed New Widths

```text
Cost Code:      w-[180px]   (slight reduction)
Memo:           w-[120px]   (give it an explicit, reasonable width)
Quantity:       w-[70px]    (reduce from 100px)
Unit Cost:      w-[100px]   (slight reduction)
Total:          w-[100px]   (slight reduction)
Address:        w-[80px]    (half of 160px)
Purchase Order: w-[180px]   (slight reduction)
Match:          w-[55px]    (renamed from "Accuracy", tighter)
Actions:        w-[50px]    (unchanged)
```

Total estimate: 180+120+70+100+100+80+180+55+50 = **935px** — fits comfortably inside the dialog.

### File Changed

**`src/components/bills/EditExtractedBillDialog.tsx`** — lines 1012–1020:
- Update `className` widths on all `<TableHead>` elements in the Job Cost table
- Rename `"Accuracy"` → `"Match"` on line 1019

No logic changes — purely column width and label text adjustments.
