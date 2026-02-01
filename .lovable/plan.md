

## Goal

1. **Remove the blue VendorPOInfo panel** from the middle of the form - it takes too much vertical space
2. **Keep PO selection only in the line item detail row** (the "Purchase Order" column dropdown)
3. **Replace the dropdown's basic tooltip** with a richer dialog showing complete information (cost code name, remaining AND total amounts)

---

## Current State

The bill entry screen has two redundant PO selection UI elements:
1. **Blue VendorPOInfo panel** (lines 589-595 in ManualBillEntry.tsx) - large, space-consuming panel
2. **POSelectionDropdown** in the line item row - compact dropdown in the "Purchase Order" column

The dropdown currently shows limited info like `2026-115E-0030 | 4470 | $1,836 remaining` without:
- The cost code **name** (e.g., "Siding")
- The total PO amount (only shows remaining)

---

## Solution

### A) Remove VendorPOInfo component usage

Delete the `<VendorPOInfo />` component from ManualBillEntry.tsx and remove related state/imports.

### B) Enhance POSelectionDropdown with info icon + dialog

1. Add a small info icon button next to the dropdown
2. Clicking the icon opens a **PO Details Dialog** showing:
   - PO Number
   - Cost Code (code + name)
   - Total PO Amount
   - Billed to Date
   - Remaining Balance
   - Related bills (similar to existing POComparisonDialog)

### C) Improve dropdown labels

Update the dropdown text to be more informative:
- Current: `2026-115E-0030 | 4470 | $1,836 remaining`
- New: `2026-115E-0030 | 4470 - Siding | $1,836 / $13,799`

This shows the cost code name and the format `remaining / total`.

---

## Implementation Details

### File 1: `src/components/bills/ManualBillEntry.tsx`

**Changes:**
- Remove import of `VendorPOInfo`
- Remove `selectedPOId` state (no longer needed at bill-header level)
- Delete the `<VendorPOInfo ... />` JSX block
- Keep `showPOSelection` hook (still needed for column visibility)
- Keep `POSelectionDropdown` in the line item rows

### File 2: `src/components/bills/POSelectionDropdown.tsx`

**Changes:**
- Update `getPOLabel()` to include cost code name and show `remaining / total` format
- Add an info icon (`Info` from lucide-react) button next to the dropdown
- Add state for dialog open/close
- Add state for which PO to show details for
- Import and render a new `PODetailsDialog` component

### File 3: `src/components/bills/PODetailsDialog.tsx` (NEW)

Create a new dialog component (similar to POComparisonDialog) that shows:
- PO Number as title
- Cost Code: code + name
- Summary cards: PO Amount | Billed to Date | Remaining
- Over budget warning if applicable
- List of related bills

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `purchaseOrder: VendorPurchaseOrder | null`
- `projectId: string | null`
- `vendorId: string | null`

---

## Visual Change

**Before (current):**
```
[Vendor field] [Date field] [Reference field]
+----------------------------------------------------+
| 3 Purchase Orders                     Vendor linked|
| [2026-115E-0030]  4470 - Siding      $1,836/$13,799|
| [2025-115E-0027]  4430 - Roofing    $27,509/$28,245|
| [2026-115E-0029]  4400 - Ext. Trim  -$2,073/$4,135 |
+----------------------------------------------------+
[Due Date] [Terms] [Attachments] [Notes]

[Cost Code] [Memo] [Qty] [Cost] [Total] [PO dropdown ▼]
```

**After (proposed):**
```
[Vendor field] [Date field] [Reference field]
[Due Date] [Terms] [Attachments] [Notes]

[Cost Code] [Memo] [Qty] [Cost] [Total] [PO dropdown ▼ ⓘ]
```

- Clicking the dropdown shows: `Auto-match by cost code`, `2026-115E-0030 | 4470 - Siding | $1,836 / $13,799`, etc.
- Clicking the info icon opens a detailed dialog with full PO information

---

## Files to modify

1. `src/components/bills/ManualBillEntry.tsx` - Remove VendorPOInfo usage
2. `src/components/bills/POSelectionDropdown.tsx` - Enhance labels + add info button/dialog
3. `src/components/bills/PODetailsDialog.tsx` - Create new dialog component

