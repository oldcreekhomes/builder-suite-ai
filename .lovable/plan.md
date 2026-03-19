

## Fix: "Failed to save insurance information" Error

### Root Cause

In `EditCompanyDialog.tsx` line 601, the `InsuranceContent` component is passed `homeBuilder=""` (empty string):

```tsx
<InsuranceContent 
  companyId={company.id}
  homeBuilder=""     // ← BUG: empty string
/>
```

When new insurance records are inserted, `home_builder_id` is set to this empty string, which fails the RLS policy (and likely a UUID type mismatch).

The `company` object already contains `home_builder_id` — it just isn't being passed through.

### Fix

**File: `src/components/companies/EditCompanyDialog.tsx`** (line 601)

Change:
```tsx
homeBuilder=""
```
To:
```tsx
homeBuilder={company.home_builder_id}
```

This is a one-line fix. The `company.home_builder_id` is already available (defined in the `Company` interface on line 70).

