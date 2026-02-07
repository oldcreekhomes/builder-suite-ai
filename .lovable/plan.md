
## Fix: Prevent Edit Company Dialog from Closing After Editing Representative

### Problem
When you save or cancel the Edit Representative dialog, the Edit Company dialog closes and returns you to the main Companies page. This happens because:

1. When a representative is updated, the code invalidates the `['companies']` query
2. This triggers a refetch of the companies list in the parent component (CompaniesTable)
3. React Query returns a new object reference for the company data
4. The state comparison in CompaniesTable causes the `editingCompany` to become stale or reset

### Solution
Remove the unnecessary `['companies']` query invalidation from the Edit Representative dialog. Editing a representative doesn't change company data, so there's no need to refetch the companies list.

---

## Implementation

### File: `src/components/companies/EditRepresentativeDialog.tsx`

**Change:** In the `onSuccess` callback of `updateRepresentativeMutation`, remove the line that invalidates the `['companies']` query.

**Before (lines 122-129):**
```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
  queryClient.invalidateQueries({ queryKey: ['companies'] });  // <-- REMOVE THIS
  toast({
    title: "Success",
    description: "Representative updated successfully",
  });
  onOpenChange(false);
},
```

**After:**
```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['company-representatives'] });
  toast({
    title: "Success",
    description: "Representative updated successfully",
  });
  onOpenChange(false);
},
```

---

### File: `src/components/companies/RepresentativeSelector.tsx`

**Change:** Similarly, remove the `['companies']` invalidation from the `deleteRepMutation.onSuccess` callback.

**Before (lines 97-103):**
```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['company-representatives', companyId] });
  queryClient.invalidateQueries({ queryKey: ['companies'] });  // <-- REMOVE THIS
  toast({
    title: "Success",
    description: "Representative deleted successfully",
  });
},
```

**After:**
```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['company-representatives', companyId] });
  toast({
    title: "Success",
    description: "Representative deleted successfully",
  });
},
```

---

## Technical Details

The root cause is that invalidating the `['companies']` query triggers React Query to refetch the companies list. When this happens:

1. The `CompaniesTable` component re-renders with new company objects
2. The `editingCompany` state (which holds the original object reference) no longer matches
3. This can cause unexpected state updates that close the Edit Company dialog

Since editing a representative doesn't actually change any company-level data (name, address, type, etc.), there's no need to invalidate the companies query. The representative data is fetched separately via the `['company-representatives', companyId]` query.

---

## Files to Change
- `src/components/companies/EditRepresentativeDialog.tsx` (remove companies query invalidation)
- `src/components/companies/RepresentativeSelector.tsx` (remove companies query invalidation from delete mutation)

---

## Expected Result
After this fix:
1. Click Edit on a representative → Edit Representative dialog stays open
2. Make changes and click Update Representative → Dialog closes
3. You remain in the Edit Company dialog on the Representatives tab
4. The representatives list updates with your changes
5. Same behavior for Delete: confirmation dialog works, and after deletion you stay in Edit Company
