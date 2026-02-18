
## Fix: Edit Extracted Bill — Attachments & Internal Notes in Third Column (50/50 Split)

### What Needs to Change

The current Row 2 uses `grid-cols-12` with four `col-span-3` items, creating 4 equal columns. The user wants **3 columns**, matching the Enter Manually form exactly:

```
Row 1: [ Vendor ]       [ Bill Date ]     [ Terms ]
Row 2: [ Due Date ]     [ Reference No. ] [ Attachments | Internal Notes ]
                                            ← 50%  →  ←      50%       →
```

The third cell in Row 2 should contain a nested `grid grid-cols-2` (or `flex gap-2`) with Attachments on the left half and Internal Notes on the right half.

### What Will Change

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

1. Change Row 2's outer grid from `grid grid-cols-12 gap-4` → `grid grid-cols-3 gap-4` (lines ~822).

2. Remove `col-span-3` from the Due Date and Reference No. divs (lines ~823, ~852).

3. Replace the two separate `col-span-3` divs (Attachments and Internal Notes) with a **single third column div** that contains a nested `grid grid-cols-2 gap-2` holding both side by side:
   - Left half: Label "Attachments" + file icon (if present) + "Add Files" button + hidden input
   - Right half: Label "Internal Notes" + "Add Internal Notes" / "View Notes" button

This is a pure layout change — no logic changes at all.
