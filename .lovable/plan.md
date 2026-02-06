
# Auto-Populate Address When Single Lot Exists

## Summary
When a project has only one lot, the Address column in "Enter with AI" should automatically populate with that lot's information instead of requiring the user to select it manually.

## Current State
- The `BatchBillReviewTable` displays lot information from `bill.lines[].lot_id` and `lot_name`
- The `pending_bill_lines` table does NOT have a `lot_id` column (only `bill_lines` does)
- Lots are stored in `project_lots` table and accessible via the `useLots` hook
- The interface already expects `lot_id` and `lot_name` on line items

## Implementation

### Step 1: Add lot_id Column to pending_bill_lines Table
Add the missing column to allow persistence of lot assignments on pending bills.

```sql
ALTER TABLE pending_bill_lines ADD COLUMN lot_id UUID REFERENCES project_lots(id);
```

### Step 2: Update BillsApprovalTabs.tsx
1. Import and use the `useLots` hook to fetch lots for the project
2. When fetching bill lines, if there's exactly one lot:
   - Auto-assign that lot's `id` and `lot_name` to each line item
3. Update the lines in the database so the assignment persists

**Code changes in `BillsApprovalTabs.tsx`:**

```tsx
// Import the useLots hook
import { useLots } from "@/hooks/useLots";

// Inside the component, fetch lots
const { lots } = useLots(effectiveProjectId);

// In the fetchAllLines effect, after fetching lines:
// If exactly 1 lot exists and line has no lot_id, auto-assign it
if (lots.length === 1) {
  const singleLot = lots[0];
  lines = lines.map(line => ({
    ...line,
    lot_id: line.lot_id || singleLot.id,
    lot_name: line.lot_name || singleLot.lot_name || `Lot ${singleLot.lot_number}`,
  }));
  
  // Optionally persist to database for lines without lot_id
  const linesToUpdate = lines.filter(l => !l.lot_id);
  if (linesToUpdate.length > 0) {
    await supabase
      .from('pending_bill_lines')
      .update({ lot_id: singleLot.id })
      .in('id', linesToUpdate.map(l => l.id));
  }
}
```

### Step 3: Update approve_pending_bill RPC (if needed)
Ensure the RPC copies `lot_id` from `pending_bill_lines` to `bill_lines` when approving.

## Technical Details

### Files to Modify:
1. **Database migration**: Add `lot_id` column to `pending_bill_lines`
2. **`src/components/bills/BillsApprovalTabs.tsx`**: 
   - Import `useLots` hook
   - Add auto-population logic in the `fetchAllLines` effect
   - Add `lots` to the effect dependencies

### Flow:
1. User uploads bills to "Enter with AI"
2. System extracts bill data and creates `pending_bill_lines`
3. On render, `BillsApprovalTabs` fetches lots for the project
4. If exactly 1 lot exists:
   - Each line item gets auto-assigned that lot's ID and name
   - The lot assignment is persisted to the database
5. `BatchBillReviewTable` displays the auto-populated address

### Edge Cases:
- If project has 0 lots: No auto-population, shows "-"
- If project has 2+ lots: No auto-population, user must select manually
- If lot already assigned: Don't override existing assignment
