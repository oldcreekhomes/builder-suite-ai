
# Implementation Plan: PO Selection for Vendors with Multiple Purchase Orders

## Problem Summary

When a vendor (like ABC Building Supply) has multiple Purchase Orders on a single project, the current automatic matching system cannot determine which specific PO an invoice should be tracked against. Users need an explicit way to select the correct PO at bill entry time.

## Current State

**Database Schema:**
- `bill_lines`: Has `cost_code_id` but no `purchase_order_id` column
- `pending_bill_lines`: Has `cost_code_id` but no `purchase_order_id` column
- `project_purchase_orders`: Contains `id`, `project_id`, `company_id`, `cost_code_id`, `po_number`, `total_amount`

**Current Matching Logic:**
The `useBillPOMatching.ts` hook matches bills to POs using a composite key:
```
project_id + vendor_id + cost_code_id → PO
```

This works when cost codes are unique per vendor/project, but fails when:
- Multiple POs exist for the same cost code (rare but possible)
- Users want explicit control over which PO to track billing against

## Implementation Plan

### Phase 1: Database Schema Updates

**Migration: Add `purchase_order_id` columns**

```sql
-- Add to bill_lines for finalized bills
ALTER TABLE bill_lines 
ADD COLUMN purchase_order_id uuid REFERENCES project_purchase_orders(id);

CREATE INDEX idx_bill_lines_purchase_order_id ON bill_lines(purchase_order_id);

-- Add to pending_bill_lines for AI-extracted bills in review
ALTER TABLE pending_bill_lines 
ADD COLUMN purchase_order_id uuid REFERENCES project_purchase_orders(id);
```

### Phase 2: Create Reusable Hook

**New File: `src/hooks/useVendorPurchaseOrders.ts`**

```typescript
export function useVendorPurchaseOrders(projectId: string | null, vendorId: string | null) {
  return useQuery({
    queryKey: ['vendor-pos', projectId, vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_purchase_orders')
        .select(`
          id,
          po_number,
          total_amount,
          cost_code_id,
          cost_codes (id, code, name)
        `)
        .eq('project_id', projectId)
        .eq('company_id', vendorId)
        .eq('status', 'approved');
      
      if (error) throw error;
      
      // Calculate remaining balance for each PO
      // (would need to join with bill_lines to get billed amounts)
      return data;
    },
    enabled: !!projectId && !!vendorId,
  });
}
```

### Phase 3: Create PO Selection Component

**New File: `src/components/bills/POSelectionDropdown.tsx`**

A reusable dropdown component that:
- Fetches available POs for the vendor + project combination
- Shows each PO with: PO Number, Cost Code, Total Amount, and optionally Remaining Balance
- Highlights POs whose cost code matches the bill line's cost code
- Allows optional selection (defaults to "Auto-match by cost code")

```
UI Layout:
┌─────────────────────────────────────────────────────┐
│ Purchase Order (Optional)                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ▼ Auto-match by cost code                       │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Dropdown Options:                                   │
│ ○ Auto-match by cost code                          │
│ ○ 2025-115E-0027 | 4430: Roofing | $28,244.92      │
│ ○ 2026-115E-0029 | 4610: Ext Trim | $4,134.28      │
│ ○ 2026-115E-0030 | 4600: Siding | $13,798.09       │
└─────────────────────────────────────────────────────┘
```

### Phase 4: Integrate into Manual Bill Entry

**Modify: `src/components/bills/ManualBillEntry.tsx`**

1. **Add state for PO selections per line:**
   ```typescript
   // Inside ExpenseRow interface
   interface ExpenseRow {
     // ...existing fields
     purchaseOrderId?: string;
   }
   ```

2. **Add the hook to fetch POs:**
   ```typescript
   const { data: vendorPOs } = useVendorPurchaseOrders(projectId, vendor);
   const hasMultiplePOs = (vendorPOs?.length || 0) >= 2;
   ```

3. **Add PO dropdown column to job cost rows (only when vendor has 2+ POs):**
   - Show conditionally: only when `hasMultiplePOs` is true
   - Pre-select PO that matches the row's cost code (smart default)
   - Allow user to override

4. **Update `handleSave` to include `purchase_order_id` in bill lines:**
   ```typescript
   const billLines: BillLineData[] = [
     ...resolvedJobRows
       .filter(row => row.accountId || row.amount)
       .map(row => ({
         // ...existing fields
         purchase_order_id: row.purchaseOrderId || undefined,  // NEW
       })),
   ];
   ```

5. **Update `useBills.ts` `BillLineData` interface:**
   ```typescript
   export interface BillLineData {
     // ...existing fields
     purchase_order_id?: string;  // NEW
   }
   ```

### Phase 5: Integrate into AI Extraction Edit Dialog

**Modify: `src/components/bills/EditExtractedBillDialog.tsx`**

1. **Add state and fetch POs after vendor is set:**
   ```typescript
   const [projectId, setProjectId] = useState<string | null>(null);
   const { data: vendorPOs } = useVendorPurchaseOrders(projectId, vendorId);
   ```

2. **Fetch project_id from the extracted data or context:**
   - The dialog needs to know which project this bill is for
   - Can be extracted from URL params or pending bill metadata

3. **Add PO selection UI to line items (only when 2+ POs exist):**
   - Show PO dropdown per line item
   - Allow user to select which PO before approving

4. **Update LineItem interface:**
   ```typescript
   interface LineItem {
     // ...existing fields
     purchase_order_id?: string;  // NEW
   }
   ```

5. **Store selection in `pending_bill_lines` when saving:**
   ```typescript
   await updateLine.mutateAsync({
     lineId: line.id,
     updates: {
       // ...existing fields
       purchase_order_id: line.purchase_order_id,  // NEW
     },
   });
   ```

### Phase 6: Update PO Matching Hook

**Modify: `src/hooks/useBillPOMatching.ts`**

Update the matching priority:
1. **Primary**: If `bill_line.purchase_order_id` is set → use that PO directly
2. **Fallback**: Match by composite key (project_id + vendor_id + cost_code_id)

```typescript
// In the query that builds matches
if (line.purchase_order_id) {
  // Direct PO link exists - use it
  const po = posById.get(line.purchase_order_id);
  if (po) matches.push(po);
} else if (line.cost_code_id) {
  // Fall back to cost code matching
  const key = `${bill.project_id}|${bill.vendor_id}|${line.cost_code_id}`;
  const po = poLookup.get(key);
  if (po) matches.push(po);
}
```

### Phase 7: Update usePendingBills Hook

**Modify: `src/hooks/usePendingBills.ts`**

Update the `updateLine` mutation to accept `purchase_order_id`:

```typescript
// In updateLine mutation
const { error } = await supabase
  .from("pending_bill_lines")
  .update({
    // ...existing fields
    purchase_order_id: updates.purchase_order_id,  // NEW
  })
  .eq("id", lineId);
```

Also update the `addLine` mutation similarly.

### Phase 8: Update approve_pending_bill Function

**Modify: `supabase/functions` or database function**

Ensure that when a pending bill is approved, the `purchase_order_id` from `pending_bill_lines` is copied to the final `bill_lines` table.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| Database Migration | CREATE | Add `purchase_order_id` to `bill_lines` and `pending_bill_lines` |
| `src/hooks/useVendorPurchaseOrders.ts` | CREATE | New hook to fetch POs for vendor+project |
| `src/components/bills/POSelectionDropdown.tsx` | CREATE | Reusable PO selection UI component |
| `src/components/bills/ManualBillEntry.tsx` | MODIFY | Add PO selection per line item |
| `src/components/bills/EditExtractedBillDialog.tsx` | MODIFY | Add PO selection for AI-extracted bills |
| `src/hooks/useBills.ts` | MODIFY | Add `purchase_order_id` to `BillLineData` interface |
| `src/hooks/usePendingBills.ts` | MODIFY | Support `purchase_order_id` in mutations |
| `src/hooks/useBillPOMatching.ts` | MODIFY | Check explicit PO first, fallback to cost code |

## UX Behavior Summary

| Scenario | PO Selection UI | Behavior |
|----------|----------------|----------|
| Vendor has 0-1 POs | Hidden | No selection needed, automatic |
| Vendor has 2+ POs | Shown per line | User can select specific PO |
| User doesn't select | Dropdown shows "Auto-match" | Falls back to cost code matching |
| User selects PO | Dropdown shows PO number | Direct link stored in bill line |

## Expected Result

After implementation:
1. User enters a bill for ABC Building Supply on 115 E Socialink Ct
2. System detects 3 POs exist for this vendor+project
3. PO selection dropdown appears on each line item
4. User selects "2025-115E-0027 | 4430: Roofing" for this invoice
5. Bill is saved with explicit `purchase_order_id` link
6. All downstream reports and matching use this explicit link
7. No ambiguity - the bill is definitively attached to the correct PO
