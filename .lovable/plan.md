

## Fix: "Add Subcontractors" Stays Checked After Deleting All Companies

### Problem
Companies are soft-deleted (archived via `archived_at` timestamp), but the onboarding progress query on line 54 of `useOnboardingProgress.ts` counts **all** companies -- including archived ones. So even after the user archives every company, the count is still > 0 and the step stays checked.

### Fix

**File: `src/hooks/useOnboardingProgress.ts` (line 54)**

Add `.is("archived_at", null)` to the companies count query so archived companies are excluded:

```ts
// Before
supabase.from("companies").select("id", { count: "exact", head: true }).eq("home_builder_id", userId),

// After
supabase.from("companies").select("id", { count: "exact", head: true }).eq("home_builder_id", userId).is("archived_at", null),
```

This is a one-line change. No other files need modification -- the invalidation logic is already correctly wired up from the previous fix.

