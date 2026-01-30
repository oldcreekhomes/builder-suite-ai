
# Fix Bill Extraction Data Sync Issues

## Problem Summary

When a bill is extracted with AI, there are two data synchronization issues:

1. **Total Amount Mismatch**: The "Extracted Bills" table shows the correct total ($482.65) from `extracted_data.total_amount`, but the "Edit Extracted Bill" dialog shows $980 because it sums the line items from `pending_bill_lines` (which incorrectly has two $490 lines).

2. **Terms/Due Date Mismatch**: The table shows "-" for Terms and Due Date (reading from `extracted_data`), but the dialog shows "Net 30" and "January 31st, 2026" (using default values and auto-calculation). These values should be synced.

## Root Cause Analysis

### Total Amount Issue
- The AI extraction edge function correctly extracts `total_amount: 482.65`
- However, it also extracts line items that sum to a different amount ($980)
- The table reads from `extracted_data.total_amount` (correct)
- The dialog reads from `pending_bill_lines` and sums them (incorrect)

### Terms/Due Date Issue  
- The dialog defaults to `net-30` and auto-calculates due date when `extracted_data` is missing these values
- When user saves the dialog, these values are saved to `extracted_data`
- But the table only shows what's in `extracted_data`, which may be null initially
- The table should also show the computed/default values for consistency

## Solution Approach

### Part 1: Make Dialog Total Match Table Total
When the dialog loads line items, if the sum of lines doesn't match `extracted_data.total_amount`, normalize the line amounts proportionally so they match the extracted total.

**File: `src/components/bills/EditExtractedBillDialog.tsx`**
- After loading lines from database, compare sum to `extracted_data.total_amount`
- If they differ, proportionally adjust each line's amount to match the extracted total
- This ensures the dialog shows the same total as the table

### Part 2: Make Table Show Computed Terms/Due Date
The table should compute/display Terms and Due Date the same way the dialog does (using defaults and auto-calculation) so they match.

**File: `src/components/bills/BatchBillReviewTable.tsx`**
- Add the same `normalizeTermsForUI()` and `computeDueDate()` helper functions from EditExtractedBillDialog
- When displaying Terms and Due Date in the table:
  - If `extracted_data` has the value, use it
  - Otherwise, compute/default the same way the dialog does
- This ensures the table preview matches what the user will see in the dialog

## Implementation Details

### Step 1: Add line amount normalization to EditExtractedBillDialog

In the `loadBillData` function (around lines 154-254), after loading lines and before setting state:

```text
// After building jobCost and expense arrays
const lineSum = [...jobCost, ...expense].reduce((sum, line) => sum + line.amount, 0);
const extractedTotal = Number(extractedData.totalAmount || extractedData.total_amount) || 0;

// If extracted total exists and differs from line sum, normalize lines
if (extractedTotal > 0 && Math.abs(lineSum - extractedTotal) > 0.01) {
  console.log(`Normalizing line amounts: sum=${lineSum}, extractedTotal=${extractedTotal}`);
  const ratio = extractedTotal / lineSum;
  
  // Apply proportional adjustment to all lines
  jobCost.forEach(line => {
    line.amount = Math.round(line.amount * ratio * 100) / 100;
    line.unit_cost = line.quantity > 0 ? line.amount / line.quantity : line.amount;
  });
  expense.forEach(line => {
    line.amount = Math.round(line.amount * ratio * 100) / 100;
    line.unit_cost = line.quantity > 0 ? line.amount / line.quantity : line.amount;
  });
  
  // Adjust last line to absorb rounding difference
  const newSum = [...jobCost, ...expense].reduce((sum, line) => sum + line.amount, 0);
  const roundingDiff = extractedTotal - newSum;
  if (Math.abs(roundingDiff) > 0 && (jobCost.length > 0 || expense.length > 0)) {
    const lastLine = jobCost.length > 0 ? jobCost[jobCost.length - 1] : expense[expense.length - 1];
    lastLine.amount = Math.round((lastLine.amount + roundingDiff) * 100) / 100;
  }
}
```

### Step 2: Add computed Terms/Due Date to BatchBillReviewTable

Add helper functions from EditExtractedBillDialog to BatchBillReviewTable:

```text
// Add at top of file (after imports)
function normalizeTermsForUI(terms: string | null | undefined): string {
  if (!terms) return 'net-30';
  if (['net-15', 'net-30', 'net-60', 'due-on-receipt'].includes(terms)) {
    return terms;
  }
  const normalized = terms.toLowerCase().trim();
  if (normalized.includes('15')) return 'net-15';
  if (normalized.includes('60')) return 'net-60';
  if (normalized.includes('receipt') || normalized.includes('cod')) return 'due-on-receipt';
  return 'net-30';
}

function computeDueDate(billDate: Date, terms: string): Date {
  const result = new Date(billDate);
  switch (terms) {
    case 'net-15': result.setDate(result.getDate() + 15); break;
    case 'net-30': result.setDate(result.getDate() + 30); break;
    case 'net-60': result.setDate(result.getDate() + 60); break;
    case 'due-on-receipt': break; // same day
    default: result.setDate(result.getDate() + 30);
  }
  return result;
}
```

Then update the Terms and Due Date display logic in the table render (around lines 606-610):

```text
// For Terms column - compute if not in extracted_data
const rawTerms = getExtractedValue(bill, 'terms', 'terms') as string | null;
const displayTerms = rawTerms ? formatTerms(rawTerms) : formatTerms(normalizeTermsForUI(null));

// For Due Date column - compute if not in extracted_data
const rawDueDate = getExtractedValue(bill, 'due_date', 'dueDate') as string | null;
let displayDueDate = rawDueDate ? formatDisplayFromAny(rawDueDate) : '-';
if (!rawDueDate && billDate) {
  const computedTerms = normalizeTermsForUI(rawTerms);
  const billDateObj = new Date(billDate as string);
  const computedDueDate = computeDueDate(billDateObj, computedTerms);
  displayDueDate = formatDisplayFromAny(computedDueDate.toISOString().split('T')[0]);
}
```

## Files to Modify

1. **`src/components/bills/EditExtractedBillDialog.tsx`**
   - Add line amount normalization logic after loading lines from database

2. **`src/components/bills/BatchBillReviewTable.tsx`**
   - Add `normalizeTermsForUI()` and `computeDueDate()` helper functions
   - Update Terms and Due Date display to use computed values when `extracted_data` is missing them

## Testing Plan

After implementation:
1. Upload the Oceanwatch HOA bill via "Enter with AI"
2. Verify the table shows $482.65, Net 30, and the computed due date
3. Open the Edit dialog - verify it shows $482.65 total (not $980)
4. Verify the Terms and Due Date in the dialog match what the table shows
5. Submit the bill and verify it goes to Approved with the correct $482.65 amount
