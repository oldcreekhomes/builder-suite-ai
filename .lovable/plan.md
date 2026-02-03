
# Fix Balance Sheet Account Sorting Order

## Problem

Accounts on the Balance Sheet are displayed in an unsorted order. Looking at the screenshot:

**Assets (Current):**
- 1030, 1020, 1320, 1430, 1670, 9150, 1050, 1040, 1060, 1010

**Should be:**
- 1010, 1020, 1030, 1040, 1050, 1060, 1320, 1430, 1670, 9150

**Liabilities (Current):**
- 2010, 2530, 2150, 2540

**Should be:**
- 2010, 2150, 2530, 2540

**Equity:**
- 2905, 32000

**Should be:**
- 2905, 32000 (correct)

---

## Solution

Use the existing `compareCostCodes` utility from `src/lib/costCodeSort.ts` to sort all account arrays numerically by their account code. This utility handles numeric sorting properly (e.g., 1010 < 1020 < 1030).

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/reports/BalanceSheetContent.tsx` | Sort assets, liabilities, and equity arrays after populating them |
| `src/components/accounting/SendReportsDialog.tsx` | Sort arrays before passing to PDF document |

---

## Implementation Details

### Step 1: Update BalanceSheetContent.tsx

Import the sorting utility and sort each category after the accounts are categorized:

```typescript
import { compareCostCodes } from "@/lib/costCodeSort";

// After the accounts?.forEach loop (around line 159):
assets.current.sort(compareCostCodes);
assets.fixed.sort(compareCostCodes);
liabilities.current.sort(compareCostCodes);
liabilities.longTerm.sort(compareCostCodes);
equity.sort(compareCostCodes);
```

### Step 2: Update SendReportsDialog.tsx

Import and apply the same sorting in the balance sheet PDF generation section:

```typescript
import { compareCostCodes } from "@/lib/costCodeSort";

// After the accounts?.forEach loop (around line 215):
assets.current.sort(compareCostCodes);
assets.fixed.sort(compareCostCodes);
liabilities.current.sort(compareCostCodes);
liabilities.longTerm.sort(compareCostCodes);
equity.sort(compareCostCodes);
```

---

## Technical Notes

- The `compareCostCodes` function already handles:
  - Numeric sorting (1010 comes before 1020)
  - Mixed alphanumeric codes (e.g., "RE-CY" for Current Year Earnings)
  - Codes with dots/segments (e.g., "1000.1" < "1000.2")
- The PDF document (`BalanceSheetPdfDocument.tsx`) doesn't need changes since it receives already-sorted arrays
- This fix applies across all projects since the sorting is done in the shared components

---

## Expected Result

After implementation, the Balance Sheet will display accounts in ascending numerical order:

**Assets:**
- 1010: Atlantic Union Bank
- 1020: Deposits
- 1030: Clearing
- 1040: Loan to OCH at N. Potomac, LLC
- 1050: Loan to OCH at Lexington
- 1060: Loan to OCH at Chesterbrook, LLC
- 1320: Land - Held For Development
- 1430: WIP - Direct Construction Costs
- 1670: Deposits - Bonds
- 9150: Ask Owner

**Liabilities:**
- 2010: Accounts Payable
- 2150: AMEX
- 2530: Loan - Land
- 2540: Anchor Loan - Refinance

**Equity:**
- 2905: Equity
- 32000: Retained Earnings
