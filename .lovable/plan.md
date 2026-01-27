
# Plan: Add Duplicate Company Detection to Transaction Forms

## Summary
Add real-time duplicate company warning to the "Pay To", "Received From", and "Vendor" fields in Write Checks, Make Deposits, and Credit Cards transaction forms. The warning will appear when users type a company name that matches or closely resembles an existing company in the system.

## Approach
Rather than modifying each transaction form individually, I will enhance the shared `VendorSearchInput` component to include duplicate detection. This ensures:
- Consistent behavior across all transaction entry points
- Single point of maintenance
- Automatic coverage for any future forms that use this component

## Implementation Details

### File: `src/components/VendorSearchInput.tsx`

**Changes:**
1. Import the `useDuplicateCompanyDetection` hook and `DuplicateCompanyWarning` component
2. Add duplicate detection logic that monitors the `searchQuery` state
3. Display the warning alert below the input when potential duplicates are found
4. Only show the warning when the user is actively typing (not when they've selected a company from the dropdown)

**Technical Notes:**
- The duplicate detection will use the existing `useDuplicateCompanyDetection` hook with `table: 'companies'`
- The warning only appears when:
  - User is typing (not after selecting an existing company)
  - The input has at least 3 characters
  - Similar companies are found
- The warning uses the existing `DuplicateCompanyWarning` component for UI consistency
- The warning is informational only (does not block submission)

### Visual Behavior
When a user types "anchor gras" (as shown in the screenshot), if similar companies like "Anchor Loans" or "Anchor Grass LLC" exist, a yellow warning box will appear below the input showing:
- "Similar companies already exist:"
- List of matching company names
- "You may be creating a duplicate."

## Files to Modify
- `src/components/VendorSearchInput.tsx` (add duplicate detection and warning display)

## No Changes Required
- `WriteChecksContent.tsx` - Uses VendorSearchInput (automatic coverage)
- `MakeDepositsContent.tsx` - Uses VendorSearchInput (automatic coverage)  
- `CreditCardsContent.tsx` - Uses VendorSearchInput (automatic coverage)
- `useDuplicateCompanyDetection.ts` - Already exists and works correctly
- `DuplicateCompanyWarning.tsx` - Already exists and works correctly
