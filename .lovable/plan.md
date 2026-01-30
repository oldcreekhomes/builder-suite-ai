
# Fix: Use AI-Extracted "Amount Due" as Single Line Item

## Problem Summary

When the AI extracts a bill, it correctly identifies the "Amount Due" ($482.65), but it also extracts individual line items from the document (like "Previous Balance" and "Quarterly Assessment"). For documents like HOA statements, these line items don't accurately represent what's owed - the "Amount Due" is the correct number.

Currently, both values are stored:
- `extracted_data.total_amount` = $482.65 (correct)
- `pending_bill_lines` = two lines totaling $980 (incorrect)

The table shows the correct $482.65, but when you open the Edit dialog, it loads the line items which add up to the wrong amount.

## Solution

**When the line items don't sum to the extracted total, replace them with a single line item matching the "Amount Due".**

This is done in two places:
1. **Backend (AI extraction)**: When inserting lines, if they don't sum to `total_amount`, create a single line instead
2. **Frontend (Edit dialog)**: As a fallback, if lines still don't match, collapse to a single line

This ensures the "Amount Due" from the invoice is always the authoritative amount.

## Technical Changes

### Change 1: AI Extraction Edge Function

**File: `supabase/functions/extract-bill-data/index.ts`**

Before inserting line items (around line 1029), add validation logic:

```typescript
// Calculate sum of extracted line items
const lineSum = extractedData.line_items.reduce((sum, item) => {
  const amount = item.amount || ((item.quantity || 1) * (item.unit_cost || 0));
  return sum + amount;
}, 0);

const extractedTotal = Number(extractedData.total_amount) || 0;

// If line items don't sum to extracted total, use single line with total amount
if (extractedTotal > 0 && Math.abs(lineSum - extractedTotal) > 0.01) {
  console.log(`⚠️ Line items sum (${lineSum}) doesn't match total_amount (${extractedTotal})`);
  console.log(`→ Creating single line item with Amount Due: ${extractedTotal}`);
  
  // Replace line items with a single line matching the total
  extractedData.line_items = [{
    description: extractedData.vendor_name ? `${extractedData.vendor_name} - Invoice` : 'Invoice Total',
    quantity: 1,
    unit_cost: extractedTotal,
    amount: extractedTotal,
    memo: null,
    account_name: null,
    cost_code_name: null,
    line_type: 'job_cost'
  }];
}
```

This ensures that when line items are confusing (like HOA statements with Previous Balance + Current Assessment), the system creates a single clean line matching the "Amount Due".

### Change 2: Edit Dialog Fallback (Already Partially Done)

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

Update the existing normalization logic to completely replace lines when they don't match:

Instead of proportionally adjusting lines, if the sum is significantly off, replace with a single line:

```typescript
// After loading lines from database
const lineSum = [...jobCost, ...expense].reduce((sum, line) => sum + line.amount, 0);
const extractedTotal = Number(extractedData.totalAmount || extractedData.total_amount) || 0;

// If extracted total exists and differs significantly from line sum, use single line
if (extractedTotal > 0 && Math.abs(lineSum - extractedTotal) > 0.01) {
  console.log(`Line sum (${lineSum}) doesn't match extracted total (${extractedTotal})`);
  console.log(`→ Replacing with single line for Amount Due`);
  
  // Create single line with the correct Amount Due
  const singleLine: JobCostLine = {
    id: crypto.randomUUID(),
    description: vendorName ? `${vendorName} - Invoice` : 'Invoice Total',
    quantity: 1,
    unit_cost: extractedTotal,
    amount: extractedTotal,
    project_id: projectId || undefined,
    project_name: projectName || undefined,
    cost_code_id: costCodeId,
    cost_code_name: costCodeName,
    memo: '',
    line_type: 'job_cost',
    line_number: 1
  };
  
  jobCost = [singleLine];
  expense = [];
}
```

Also filter out $0 lines as previously discussed:
```typescript
// Filter out any $0 lines
jobCost = jobCost.filter(line => line.amount > 0);
expense = expense.filter(line => line.amount > 0);
```

## Files to Modify

1. **`supabase/functions/extract-bill-data/index.ts`**
   - Add validation before line item insertion
   - Replace mismatched lines with single "Amount Due" line

2. **`src/components/bills/EditExtractedBillDialog.tsx`**
   - Update normalization to replace (not adjust) when lines don't match
   - Filter out $0 amount lines

## Expected Result

After this fix:
1. Upload the Oceanwatch HOA bill via "Enter with AI"
2. AI extracts `total_amount: 482.65` (Amount Due)
3. AI sees line items don't sum to that amount
4. AI creates **single line item: $482.65**
5. Table shows $482.65
6. Dialog shows **one line: $482.65**
7. Both match perfectly

## Why This Approach?

- The "Amount Due" is what the user owes - it's the source of truth
- Individual line items on statements (like Previous Balance, Credits, etc.) are often confusing and don't represent actual charges
- A single clean line matching the Amount Due is simpler and more accurate for accounting purposes
- Users can always split the line manually if they need itemization
