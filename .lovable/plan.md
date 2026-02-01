
## Goal

Two improvements to Purchase Order selection behavior:

1. **Smart auto-select**: When user picks a Cost Code (e.g., "4430 - Roofing"), automatically select the matching PO if one exists for that cost code. User can still change it if needed.

2. **Reorder dropdown options**: 
   - First: "Auto-match by cost code"
   - Next: All applicable POs for this vendor
   - Last: "No purchase order" (always shown as an escape hatch)

---

## Current Behavior

When user selects a cost code like "4430 - Roofing":
- The Cost Code field updates to "4430 - Roofing"
- The PO dropdown stays on "Auto-match by cost code" (doesn't proactively select the matching PO)

Current dropdown order (when POs exist):
1. Auto-match by cost code
2. PO options...
3. *(No Purchase Order is hidden)*

---

## Solution

### A) Auto-Select Matching PO on Cost Code Change

When the user selects a cost code in the Job Cost or Expense tab:
1. Look up the vendor's POs for this project
2. Find a PO with matching `cost_code_id`
3. If found, automatically set `purchaseOrderId` to that PO's ID
4. User can still manually change the selection

**Implementation:**
- Pass the `purchaseOrders` data (or a callback) to the cost code selection handler
- In `onCostCodeSelect`, after setting the cost code, also find and set the matching PO

### B) Reorder Dropdown Options

New order for when vendor has POs:
1. **Auto-match by cost code** (first, as the "smart" default)
2. **All vendor POs** (e.g., "2026-115E-0030 | 4470 - Siding | $1,836 / $13,799")
3. **No purchase order** (last, as an explicit opt-out)

---

## Technical Implementation

### File 1: `src/components/bills/POSelectionDropdown.tsx`

**Changes:**
1. Move "No purchase order" (`__none__`) to the bottom of the dropdown (after all PO options)
2. Keep "Auto-match by cost code" (`__auto__`) at the top when POs exist
3. PO options in the middle
4. Add export of `findMatchingPO()` helper function that can be used by parent to auto-select

```tsx
// New export helper for parent component to find matching PO
export function findMatchingPOForCostCode(
  purchaseOrders: VendorPurchaseOrder[] | undefined,
  costCodeId: string
): string | undefined {
  if (!purchaseOrders || !costCodeId) return undefined;
  const match = purchaseOrders.find(po => po.cost_code_id === costCodeId);
  return match?.id;
}
```

**Updated dropdown order:**
```tsx
<SelectContent>
  {/* 1. Auto-match (when POs exist) */}
  {hasPurchaseOrders && (
    <SelectItem value="__auto__">Auto-match by cost code</SelectItem>
  )}
  
  {/* 2. All vendor POs */}
  {hasPurchaseOrders && purchaseOrders.map((po) => (
    <SelectItem key={po.id} value={po.id}>{getPOLabel(po)}</SelectItem>
  ))}
  
  {/* 3. No purchase order (always last) */}
  <SelectItem value="__none__">No purchase order</SelectItem>
</SelectContent>
```

### File 2: `src/components/bills/ManualBillEntry.tsx`

**Changes:**
1. Import `useVendorPurchaseOrders` hook to get PO data at form level
2. Import the new `findMatchingPOForCostCode` helper
3. Update `onCostCodeSelect` callback for Job Cost rows to auto-set matching PO
4. Update Account (Expense) tab similarly if expense accounts should also match

**Job Cost callback update (around line 700):**
```tsx
onCostCodeSelect={(costCode) => {
  updateJobCostRow(row.id, 'accountId', costCode.id);
  updateJobCostRow(row.id, 'account', `${costCode.code} - ${costCode.name}`);
  
  // Auto-select matching PO if one exists
  const matchingPO = findMatchingPOForCostCode(vendorPOs, costCode.id);
  if (matchingPO) {
    updateJobCostRow(row.id, 'purchaseOrderId', matchingPO);
  }
}}
```

---

## Expected Behavior

**When user selects "4430 - Roofing" cost code:**
1. Cost Code field shows "4430 - Roofing" 
2. Purchase Order dropdown automatically changes to the Roofing PO (e.g., "2025-115E-0027 | 4430 - Roofing | $27,509 / $28,245")
3. User can still change the PO selection if needed

**Dropdown options (when vendor has POs):**
1. Auto-match by cost code
2. 2026-115E-0030 | 4470 - Siding | $1,836 / $13,799
3. 2025-115E-0027 | 4430 - Roofing | $27,509 / $28,245
4. 2026-115E-0029 | 4400 - Exterior Trim | -$2,073 / $4,135
5. No purchase order *(at the bottom)*

**Dropdown options (when vendor has NO POs):**
1. No purchase order *(only option)*

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/bills/POSelectionDropdown.tsx` | Reorder dropdown (auto-match, POs, then no-PO last); add `findMatchingPOForCostCode` helper export |
| `src/components/bills/ManualBillEntry.tsx` | Import vendor POs hook; auto-select matching PO when cost code is selected |

---

## Edge Cases Handled

1. **Vendor has no POs**: Dropdown shows only "No purchase order"
2. **Cost code has no matching PO**: PO selection stays on "Auto-match by cost code" (doesn't force a selection)
3. **User manually changes PO after auto-select**: Their manual selection is preserved
4. **Vendor changes**: PO data refreshes, existing row selections reset appropriately
