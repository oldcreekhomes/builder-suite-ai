

## Goal

1. **Expand the PO panel horizontally** to span across all 3 columns (Vendor, Date, Reference No.), aligning with the right edge of the form
2. **Make PO rows clickable/selectable** with visual feedback - clicking highlights the row, clicking again deselects

---

## Problem Analysis

### Width Issue
Currently `VendorPOInfo` is nested inside the first `<div>` of the 3-column grid:
```
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="space-y-2">          <!-- Column 1 only -->
    <Label>Vendor</Label>
    <VendorSearchInput ... />
    <VendorPOInfo ... />               <!-- Constrained to column 1 width -->
  </div>
  <div>Date</div>                      <!-- Column 2 -->
  <div>Reference No.</div>             <!-- Column 3 -->
</div>
```

### Selection Issue
The PO rows are currently display-only `<div>` elements with no click handlers or state tracking.

---

## Solution

### A) Expand width (ManualBillEntry.tsx)

Move `VendorPOInfo` **outside** the 3-column grid so it can span full width:

```
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="space-y-2">
    <Label>Vendor</Label>
    <VendorSearchInput ... />
  </div>
  <div>Date</div>
  <div>Reference No.</div>
</div>

{/* Now outside the grid - full width */}
<VendorPOInfo 
  projectId={projectId} 
  vendorId={vendorId}
  selectedPOId={selectedPOId}
  onSelectPO={setSelectedPOId}
/>
```

### B) Add selection behavior (VendorPOInfo.tsx)

1. Add new props: `selectedPOId?: string` and `onSelectPO?: (poId: string | undefined) => void`
2. Add click handler to each PO row that toggles selection
3. Add visual feedback for selected state (border highlight, background change)
4. Make rows look clickable with `cursor-pointer` and hover states

### C) State management (ManualBillEntry.tsx)

Add state for tracking the selected PO:
```typescript
const [selectedPOId, setSelectedPOId] = useState<string | undefined>();
```

---

## Implementation Details

### File 1: `src/components/bills/VendorPOInfo.tsx`

**Changes:**
- Add `selectedPOId` and `onSelectPO` props to interface
- Update PO row styling:
  - Add `cursor-pointer` 
  - Add hover effect: `hover:bg-blue-100 dark:hover:bg-blue-900/50`
  - Selected state: `ring-2 ring-primary bg-primary/10`
- Add onClick handler that calls `onSelectPO(po.id)` or `onSelectPO(undefined)` to toggle

**Visual states:**
- Default: light border, white background
- Hover: slightly blue background
- Selected: primary color ring, light primary background

### File 2: `src/components/bills/ManualBillEntry.tsx`

**Changes:**
- Move `<VendorPOInfo />` outside the 3-column grid, placing it in its own full-width row
- Add `selectedPOId` state
- Pass `selectedPOId` and `onSelectPO` props to VendorPOInfo
- Clear `selectedPOId` when vendor changes (reset selection)

---

## Expected Result

1. The PO panel will stretch from Vendor to Reference No. (full form width)
2. Cost code names will be fully readable (no truncation needed with more space)
3. Clicking a PO row highlights it (blue ring/border)
4. Clicking the same row again deselects it
5. Selected PO can later be used to auto-fill line items

---

## Files to modify

- `src/components/bills/VendorPOInfo.tsx` (add selection props, click handler, visual states)
- `src/components/bills/ManualBillEntry.tsx` (move VendorPOInfo outside grid, add selection state)

