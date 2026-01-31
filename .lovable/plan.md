

# Fix: PO Selection Column Not Appearing After Vendor Selection

## Problem Identified

The Purchase Order selection column is not appearing even though ABC Building Supply has 3 POs on this project. After investigating the code, I found that:

1. The `useShouldShowPOSelection(projectId, vendor)` hook is correctly checking for multiple POs
2. The hook requires both a valid `projectId` AND a valid `vendorId` (UUID)
3. The issue is that the `vendor` state might not be getting set as a UUID when you select from the dropdown

The `VendorSearchInput` component has a timing issue: it uses `onBlur` with a 200ms delay to hide the dropdown, and `onMouseDown` to select. If the click doesn't register properly, the display text shows the company name but the actual vendor UUID is never passed to the parent component.

## Solution

Add an `onBlur` auto-select behavior to `VendorSearchInput` so that when the user types a company name and clicks away (blur), it automatically selects the matching company and passes the UUID to the parent. This ensures the vendor ID is always set when a valid company name is displayed.

## Changes Required

### 1. Update VendorSearchInput.tsx

Add logic in `handleInputBlur` to auto-select a matching company if the typed text exactly matches a company name:

```typescript
const handleInputBlur = () => {
  setTimeout(() => {
    setShowResults(false);
    
    // Auto-select if typed text exactly matches a company name
    if (searchQuery && !value) {
      const matchingCompany = companies.find(
        c => c.company_name.toLowerCase() === searchQuery.toLowerCase()
      );
      if (matchingCompany) {
        onChange(matchingCompany.id);
        setIsUserTyping(false);
        if (onCompanySelect) {
          onCompanySelect({
            company_name: matchingCompany.company_name,
            address: matchingCompany.address
          });
        }
      }
    }
  }, 200);
};
```

### 2. Add Visual Indicator in ManualBillEntry

Add a helpful message when a vendor with multiple POs is selected, making it clearer that PO selection is available:

```tsx
{showPOSelection && (
  <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-2 rounded-md">
    This vendor has multiple POs on this project. 
    Select which PO to track each line item against in the Job Cost grid.
  </div>
)}
```

## Testing Steps

After implementation:
1. Navigate to Manual Bill Entry on a project
2. Type "ABC Building Supply" in the vendor field
3. Either click to select from dropdown OR click away (blur)
4. The Purchase Order column should now appear in the Job Cost grid
5. Each line item row will have a dropdown showing:
   - Auto-match by cost code (default)
   - 2025-115E-0027 | 4430 | $X remaining
   - 2026-115E-0029 | 4400 | $X remaining  
   - 2026-115E-0030 | 4470 | $X remaining

## Files to Modify

| File | Change |
|------|--------|
| `src/components/VendorSearchInput.tsx` | Add auto-select on blur for exact company name matches |
| `src/components/bills/ManualBillEntry.tsx` | Add visual indicator when PO selection is available |

