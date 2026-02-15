

## Fix: Onboarding Checklist Not Updating After Company Profile Save

### Problem

When the user saves their company HQ address and returns to the dashboard, the "Set Up Company Profile" step still appears unchecked. This happens because:

1. The `useCompanyHQ` hook invalidates the `onboarding-progress` query key on save, but the checklist also depends on a separate `onboarding-live-checks` query that re-checks the database directly.
2. That `onboarding-live-checks` query has a 30-second stale time, so it serves cached (stale) data when the user lands back on the dashboard.

### Fix

**File: `src/hooks/useCompanyHQ.ts`**

Add invalidation of the `onboarding-live-checks` query key in the `onSuccess` callback, alongside the existing invalidations. This ensures the live check re-fetches fresh data when the user returns to the dashboard.

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['company-hq'] });
  queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
  queryClient.invalidateQueries({ queryKey: ['onboarding-live-checks'] });  // <-- add this
  toast.success('Company headquarters updated');
},
```

This is a one-line change that ensures the checklist immediately reflects the completed step when the dashboard loads.

