
## Problem Summary

The "Enter with AI" tab displays fallback/computed values for Terms and Due Date when the AI extraction doesn't capture them, but when submitting bills, the actual NULL values from the extraction are sent to the database - causing the Review tab to show dashes.

**Evidence from database:**
- Bill in Review tab: `terms: NULL`, `due_date: NULL`
- BatchBillReviewTable displays: "Net 30" and "01/31/26" (computed from bill_date + 30 days)

This creates a confusing UX where users see data in "Enter with AI" but it disappears in "Review".

---

## Solution

Synchronize the submission logic with the display logic so that if the UI shows a value, that same value gets saved to the database.

### Changes to BillsApprovalTabs.tsx

In the `handleSubmitAllBills` function (around lines 186-224), apply the same fallback/computation logic that `BatchBillReviewTable.tsx` uses for display:

**Add helper functions** (reuse from BatchBillReviewTable):

```typescript
// Normalize terms from any format to standardized dropdown values
function normalizeTermsForSubmit(terms: string | null | undefined): string {
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

// Compute due date from bill date and terms
function computeDueDateFromBillDate(billDate: string, terms: string): string {
  const date = new Date(billDate);
  switch (terms) {
    case 'net-15': date.setDate(date.getDate() + 15); break;
    case 'net-30': date.setDate(date.getDate() + 30); break;
    case 'net-60': date.setDate(date.getDate() + 60); break;
    case 'due-on-receipt': break; // same day
    default: date.setDate(date.getDate() + 30);
  }
  return date.toISOString().split('T')[0];
}
```

**Update bill mapping** to apply these functions:

Current:
```typescript
const dueDate = bill.extracted_data?.due_date || bill.extracted_data?.dueDate || bill.due_date;
const terms = bill.extracted_data?.terms;
```

Change to:
```typescript
// Apply same fallback logic as BatchBillReviewTable display
const rawTerms = bill.extracted_data?.terms;
const terms = normalizeTermsForSubmit(rawTerms);

let dueDate = bill.extracted_data?.due_date || bill.extracted_data?.dueDate || bill.due_date;
if (!dueDate && billDate) {
  dueDate = computeDueDateFromBillDate(billDate, terms);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/bills/BillsApprovalTabs.tsx` | Add `normalizeTermsForSubmit` and `computeDueDateFromBillDate` helpers; Update `handleSubmitAllBills` to apply fallback logic for terms and due_date |

---

## Technical Details

The synchronization ensures:
1. If `terms` is null/undefined in extracted_data, default to `"net-30"` (same as display)
2. If `due_date` is null/undefined but `bill_date` exists, compute it using `bill_date + terms` (same as display)
3. The Review tab will show the exact same Terms and Due Date values that were visible in the "Enter with AI" tab

This matches the existing pattern already documented in the memory for AI bill extraction logic synchronization.

---

## Expected Result

After this fix:
- Bills submitted from "Enter with AI" will have Terms defaulted to "Net 30" when not extracted
- Bills will have Due Date computed from Bill Date + Terms when not extracted  
- The Review tab will display the same values shown in "Enter with AI"
- Manual entry and AI entry will produce consistent data in the database
