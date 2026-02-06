
# Add Cost Code Validation to Bill Submission (Enter with AI)

## Problem
Bills can currently be submitted through "Enter with AI" without a cost code assigned to line items. Every invoice must have a cost code (for job_cost lines) or account (for expense lines) before submission.

## Current State

### Manual Bill Entry (Already Validated)
`ManualBillEntry.tsx` (lines 316-380) already properly validates:
- Job cost rows must have `accountId` (cost code) - shows toast error and prevents save
- Expense rows must have `accountId` (account) - shows toast error and prevents save

### Enter with AI (MISSING Validation)
`BillsApprovalTabs.tsx` `handleSubmitAllBills()` currently validates:
- Duplicate reference numbers
- Missing vendor ID
- Missing project ID

**Missing**: Cost code/account validation on line items

## Solution

Add cost code validation to `handleSubmitAllBills()` in `BillsApprovalTabs.tsx` that mirrors the Manual Bill Entry validation logic.

## Technical Changes

### File: `src/components/bills/BillsApprovalTabs.tsx`

**Add validation after duplicate check (around line 283, before "Only proceed with validated bills"):**

```tsx
// Validate cost codes/accounts on all selected bills
const billsWithMissingCostCodes: { fileName: string; missingCount: number }[] = [];

for (const bill of validatedBills) {
  let missingCount = 0;
  
  bill.lines?.forEach((line) => {
    // For job_cost lines, cost_code_id is required
    // For expense lines, account_id is required
    if (line.line_type === 'job_cost' && !line.cost_code_id) {
      missingCount++;
    } else if (line.line_type === 'expense' && !line.account_id) {
      missingCount++;
    }
  });
  
  if (missingCount > 0) {
    billsWithMissingCostCodes.push({
      fileName: bill.file_name,
      missingCount
    });
  }
}

if (billsWithMissingCostCodes.length > 0) {
  const billNames = billsWithMissingCostCodes
    .map(b => b.fileName)
    .slice(0, 3)
    .join(', ');
  const remaining = billsWithMissingCostCodes.length > 3 
    ? ` and ${billsWithMissingCostCodes.length - 3} more` 
    : '';
  
  toast({
    title: "Missing Cost Codes",
    description: `Cannot submit: ${billsWithMissingCostCodes.length} bill(s) are missing cost codes (${billNames}${remaining}). Please assign cost codes before submitting.`,
    variant: "destructive",
  });
  setIsSubmitting(false);
  return;
}
```

## Validation Logic Summary

| Line Type | Required Field | Error Message |
|-----------|----------------|---------------|
| `job_cost` | `cost_code_id` | "Missing cost codes" |
| `expense` | `account_id` | "Missing cost codes" (same message for simplicity) |

## User Experience

1. User selects bills in "Enter with AI" tab
2. User clicks "Submit Selected Bills"
3. System checks each bill's line items:
   - `job_cost` lines must have `cost_code_id`
   - `expense` lines must have `account_id`
4. If any line is missing required data:
   - Toast shows: "Missing Cost Codes - Cannot submit: X bill(s) are missing cost codes (file1.pdf, file2.pdf...). Please assign cost codes before submitting."
   - Submission is blocked
5. User must edit those bills and assign cost codes, then retry

## Files to Modify
- `src/components/bills/BillsApprovalTabs.tsx` - Add cost code validation logic
