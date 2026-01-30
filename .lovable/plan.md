
# Fix: Sync Cost Code Between Table and Edit Extracted Bill Dialog

## Problem Summary

The "Extracted Bills" table shows "NONE" for the Cost Code column, but when opening the "Edit Extracted Bill" dialog, it displays "2170 - HOA Fees". These two views should always display the same data.

## Root Cause Analysis

The issue occurs in the AI bill extraction process:

1. **First**: The vendor is matched and `autoAssignSingleCostCode()` is called (line 923), which correctly assigns the vendor's default cost code (like "2170: HOA Fees") to all line items

2. **Then**: The normalization logic (line 1039-1054) detects that line items don't sum to the total amount, and replaces ALL line items with a single "Amount Due" line

3. **Problem**: This newly created single line has `cost_code_name: null` - it doesn't preserve the cost code that was assigned earlier

4. **Result**: The `pending_bill_lines` table stores the line with `cost_code_id: null` and `cost_code_name: null`, so the table shows "NONE"

5. **Dialog behavior**: When the dialog opens, a separate useEffect fetches the vendor's default cost code and applies it to the lines for display, so the user sees "2170 - HOA Fees"

## Solution

### Part 1: Backend Fix (Primary)
Update the normalization logic in `extract-bill-data` edge function to look up and include the vendor's default cost code when creating the single "Amount Due" line.

**File: `supabase/functions/extract-bill-data/index.ts`**

Before the normalization block (around line 1029), if we're about to create a single line, look up the vendor's cost code first:

```typescript
// Calculate line sum and check if normalization is needed
const lineSum = extractedData.line_items.reduce((sum: number, item: any) => {
  const amount = item.amount || ((item.quantity || 1) * (item.unit_cost || 0));
  return sum + amount;
}, 0);

const extractedTotal = Number(extractedData.total_amount) || 0;

// If normalization is needed (replacing with single Amount Due line), 
// look up vendor's default cost code first
let defaultCostCodeName = null;
if (extractedTotal > 0 && Math.abs(lineSum - extractedTotal) > 0.01) {
  if (extractedData.vendor_id) {
    const { data: vendorCostCodes } = await supabase
      .from('company_cost_codes')
      .select(`
        cost_code_id,
        cost_codes (id, code, name)
      `)
      .eq('company_id', extractedData.vendor_id);
    
    if (vendorCostCodes && vendorCostCodes.length === 1) {
      const cc = vendorCostCodes[0].cost_codes;
      if (cc) {
        defaultCostCodeName = `${cc.code}: ${cc.name}`;
        console.log(`→ Using vendor default cost code for Amount Due line: ${defaultCostCodeName}`);
      }
    }
  }
  
  // Replace line items with single line including the cost code
  extractedData.line_items = [{
    description: extractedData.vendor_name ? `${extractedData.vendor_name} - Invoice` : 'Invoice Total',
    quantity: 1,
    unit_cost: extractedTotal,
    amount: extractedTotal,
    memo: null,
    account_name: null,
    cost_code_name: defaultCostCodeName,  // <-- Include vendor's default cost code
    line_type: 'job_cost'
  }];
}
```

### Part 2: Frontend Fallback (Secondary)
Ensure that when the dialog saves, if the user didn't change the cost code, it still persists properly. The existing save logic already handles this correctly by looking up the cost_code_id and cost_code_name before saving to `pending_bill_lines`.

No additional changes needed in the frontend - the save functionality already works correctly.

## Files to Modify

1. **`supabase/functions/extract-bill-data/index.ts`**
   - Update the normalization block (around lines 1029-1054) to look up vendor's default cost code
   - Include the cost code when creating the single "Amount Due" line

## Expected Result

After this fix:
1. Upload the Oceanwatch HOA bill via "Enter with AI"
2. AI matches vendor "Oceanwatch Homeowners Association"
3. AI creates single line for $482.65 (Amount Due) **with cost code "2170: HOA Fees"**
4. Table shows "2170: HOA Fees" in the Cost Code column
5. Dialog shows "2170 - HOA Fees" - both match perfectly

## Testing Steps

1. Delete the existing pending bill for Oceanwatch HOA
2. Re-upload the same invoice using "Enter with AI"
3. Verify the table shows "2170: HOA Fees" (or similar) instead of "NONE"
4. Open the Edit dialog and verify the cost code matches
5. Save and verify both still match
