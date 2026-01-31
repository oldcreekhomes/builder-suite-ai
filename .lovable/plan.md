

## Goal

Make each Purchase Order row fit on a single line with a clean 3-column layout that's easy to scan.

---

## Current Problem

The PO rows are using flexbox with `justify-between`, but:
- No fixed column widths
- Text wraps freely (e.g., "Lumber & Framing Material" breaks to two lines)
- "remaining" and "of $X" display as separate chunks that wrap

---

## Solution

Restructure each PO row into a **3-column grid** with:

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| PO Number | Cost Code | Remaining / Total |
| `2025-115E-0008` | `4330 - Lumber & Framing` | `$21,542 / $21,542` |

### Layout approach:
- Use CSS Grid: `grid grid-cols-3`
- Column 1 (PO#): Fixed width, `whitespace-nowrap`
- Column 2 (Cost Code): Truncate long names with `truncate` + tooltip
- Column 3 (Amounts): Right-aligned, compact format `$X / $Y`

### Text changes:
- Instead of: `$21,542 remaining of $21,542`
- Use: `$21,542 / $21,542` (shorter, fits on one line)
- Or: `$21,542 left` if they've billed against it

---

## Implementation

### File: `src/components/bills/VendorPOInfo.tsx`

1. Change the PO row container from `flex justify-between` to `grid grid-cols-[auto_1fr_auto]`
2. Add `whitespace-nowrap` to PO number badge
3. Add `truncate` to cost code name with title tooltip for full text
4. Compact the amount display: `$X / $Y` format
5. Reduce vertical padding slightly for a tighter look

### Updated row structure:
```
<div className="grid grid-cols-[120px_1fr_140px] gap-2 items-center text-xs ...">
  <Badge>{po_number}</Badge>
  <span className="truncate" title="4330 - Lumber & Framing Material">
    4330 - Lumber & Framing Material
  </span>
  <span className="text-right whitespace-nowrap">
    $21,542 / $21,542
  </span>
</div>
```

---

## Expected Result

Each PO displays on exactly one line:

```
[2025-115E-0008]  4330 - Lumber & Framing...   $21,542 / $21,542
[2025-115E-0007]  4350 - Roof Trusses          $7,007 / $7,007
[2025-115E-0001]  4340 - Floor Joists          $14,899 / $14,899
```

- PO numbers stay intact (no wrapping)
- Cost code names truncate with "..." if too long (full text on hover)
- Amounts are compact and right-aligned

---

## Files to modify

- `src/components/bills/VendorPOInfo.tsx`

