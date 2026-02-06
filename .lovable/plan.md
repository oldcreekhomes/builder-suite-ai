
# Plan: Auto-Split Bills Immediately Upon Display (Not on Submit)

## The Current Problem

You're seeing "-" in the Address column on the "Enter with AI" tab because:

1. **Splitting happens too late** - The edge function only runs when you click "Submit Selected Bills"
2. **Missing lot_name in query** - Even after splitting, the query doesn't join `project_lots` to get lot names

## The Simple Fix

### When Should Auto-Split Happen?

**Current flow:**
```
Upload PDF → Extract → Show on Enter with AI (Address = "-") → Click Submit → Split → Move to Review
```

**New flow:**
```
Upload PDF → Extract → Auto-split immediately → Show on Enter with AI (Address = "Lot 1" or "+3") → Click Submit → Move to Review
```

The auto-split will happen **as soon as the bills load on the Enter with AI tab**, not when you submit.

## Implementation

### Step 1: Join `project_lots` when fetching pending_bill_lines

**File:** `src/components/bills/BillsApprovalTabs.tsx` (lines 95-98)

Change from:
```typescript
const { data: lines } = await supabase
  .from('pending_bill_lines')
  .select('*')
  .eq('pending_upload_id', bill.id)
```

To:
```typescript
const { data: lines } = await supabase
  .from('pending_bill_lines')
  .select('*, project_lots(id, lot_number, lot_name)')
  .eq('pending_upload_id', bill.id)
```

Then map `lot_name` from the joined data so the UI can display it properly.

### Step 2: Auto-split when bills first load (move split logic to useEffect)

**File:** `src/components/bills/BillsApprovalTabs.tsx`

Move the auto-split logic from `handleSubmitAllBills` (line 338-371) into the `useEffect` that fetches lines (line 80-147).

Logic:
1. After fetching lines, check if project has 2+ lots
2. If any lines are missing `lot_id`, call the edge function to split
3. Refetch and display with addresses populated

This way, the user sees the split **immediately** when the tab loads.

### Step 3: Remove split logic from submission flow

**File:** `src/components/bills/BillsApprovalTabs.tsx` (lines 338-371)

Remove the `if (lots.length >= 2)` block from `handleSubmitAllBills` since splitting will already be done on load.

## Expected Behavior After Fix

| Lots | What User Sees on "Enter with AI" Tab |
|------|--------------------------------------|
| 1 lot | Address column shows "Lot 1" |
| 2 lots | Address column shows "+2" with hover showing 50/50 split |
| 3 lots | Address column shows "+3" with hover showing ~33% each |

User can then edit the amounts/allocations in the Edit dialog before submitting if they want different splits.

## Files to Change

| File | Changes |
|------|---------|
| `src/components/bills/BillsApprovalTabs.tsx` | 1. Join `project_lots` in query 2. Move auto-split to useEffect 3. Remove split from submit handler |

## Technical Detail: Query with Join

```typescript
const { data: lines } = await supabase
  .from('pending_bill_lines')
  .select('*, project_lots(id, lot_number, lot_name)')
  .eq('pending_upload_id', bill.id)
  .order('line_number');

// Map to include lot_name for display
const processedLines = lines?.map(line => ({
  ...line,
  lot_name: line.project_lots?.lot_name || 
            (line.project_lots ? `Lot ${line.project_lots.lot_number}` : null)
}));
```
