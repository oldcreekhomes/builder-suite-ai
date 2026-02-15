

## Improve Company HQ Save Flow and Update Description Text

### Changes

**1. Redirect to dashboard after successful save (`src/hooks/useCompanyHQ.ts`)**

Update the `onSuccess` callback of the mutation to also invalidate the onboarding progress cache (so the checklist reflects the completed step immediately). Return `mutateAsync` instead of `mutate` so the component can chain a navigation call after success.

**2. Navigate to dashboard from CompanyProfileTab (`src/components/settings/CompanyProfileTab.tsx`)**

- Import `useNavigate` from react-router-dom
- In `handleSave`, await the mutation and then call `navigate("/")` to return to the dashboard
- The existing toast ("Company headquarters updated") already confirms the save

**3. Update the CardDescription text**

Replace:
> "This address determines your free marketplace search radius (30 miles). Suppliers beyond this range require a paid subscription."

With something like:
> "Set your company's main office location. This helps BuilderSuite personalize your experience and connect you with nearby resources."

This removes any mention of cost/pricing while still explaining why the address matters.

### Technical Details

- In `useCompanyHQ.ts`: add `queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] })` inside `onSuccess` so the dashboard checklist updates immediately. Also expose `updateHQAsync: updateHQMutation.mutateAsync`.
- In `CompanyProfileTab.tsx`: use `useNavigate()`, call `await updateHQAsync(...)` then `navigate("/")` in `handleSave`. Update the `CardDescription` text.
