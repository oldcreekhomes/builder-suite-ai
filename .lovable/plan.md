
# Duplicate Company Warning for Transaction Pages

## Summary
Add the same duplicate company detection warning system to the Write Checks, Make Deposits, and Credit Cards transaction forms. When users type a vendor/company name, the system will check for similar existing companies and display a warning, helping prevent duplicate company entries.

## Current State
The duplicate company detection is already implemented and working in:
- AddCompanyDialog.tsx (Companies tab)
- AddMarketplaceCompanyDialog.tsx (Marketplace)

The same components will be reused:
- `useDuplicateCompanyDetection` hook (already exists)
- `DuplicateCompanyWarning` component (already exists)

## Implementation Details

### File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/components/transactions/CreditCardsContent.tsx` | Modify | Add duplicate detection for Vendor field |
| `src/components/transactions/WriteChecksContent.tsx` | Modify | Add duplicate detection for Pay To field |
| `src/components/transactions/MakeDepositsContent.tsx` | Modify | Add duplicate detection for Received From field |

### Changes Per Component

#### 1. CreditCardsContent.tsx (Credit Cards)
- Import `useDuplicateCompanyDetection` hook and `DuplicateCompanyWarning` component
- Add the hook using the `vendor` state value (the typed company name)
- Display warning below the Vendor input when:
  - Not in viewing mode (creating new transaction)
  - Similar companies are found
- The vendor field uses `vendor` state which contains the company name text

#### 2. WriteChecksContent.tsx (Write Checks)
- Import `useDuplicateCompanyDetection` hook and `DuplicateCompanyWarning` component
- Add the hook using the `payToName` state value (the typed payee name)
- Display warning below the Pay To input when:
  - Not in viewing mode (creating new transaction)
  - Similar companies are found
- The Pay To field stores the name in `payToName` state

#### 3. MakeDepositsContent.tsx (Make Deposits)
- Import `useDuplicateCompanyDetection` hook and `DuplicateCompanyWarning` component
- Add the hook using the `depositSourceName` state value
- Display warning below the Received From input when:
  - Not in viewing mode (creating new transaction)
  - Similar companies are found
- The Received From field stores the name in `depositSourceName` state

### User Experience
When typing a vendor name in any of these forms:

```
+--------------------------------------------------+
| Vendor / Pay To / Received From                  |
| [Anchor Loans_________________________]          |
|                                                  |
| (Warning box appears below when similar found)   |
| ⚠️ Similar companies already exist:              |
|   • Anchor Loans LP                              |
| You may be creating a duplicate.                 |
+--------------------------------------------------+
```

### Technical Notes
- The warning only appears when NOT in viewing mode (new transactions only)
- Uses the same 300ms debounce as the company creation dialogs
- Queries the `companies` table (same as existing implementation)
- Warning is informational only - does not block form submission
- The hook is already configured to filter out archived companies

### Code Pattern (same for all three components)

```typescript
// Import at top
import { useDuplicateCompanyDetection } from "@/hooks/useDuplicateCompanyDetection";
import { DuplicateCompanyWarning } from "@/components/companies/DuplicateCompanyWarning";

// Inside component (after state declarations)
const { potentialDuplicates, isChecking } = useDuplicateCompanyDetection(
  vendorNameState, // vendor, payToName, or depositSourceName
  { table: 'companies' }
);

// In JSX, below the VendorSearchInput
{!isViewingMode && (
  <DuplicateCompanyWarning
    potentialDuplicates={potentialDuplicates}
    isChecking={isChecking}
  />
)}
```

## Why This Approach
- Reuses existing, tested duplicate detection logic
- Consistent UI/UX across the application
- No new database queries or tables needed
- Minimal code changes (add ~10 lines per component)
- Only shows during new transaction creation, not when viewing existing data
