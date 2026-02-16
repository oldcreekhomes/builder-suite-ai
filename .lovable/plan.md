

## Show Onboarding Checklist to All Company Members (Owners + Employees)

### Problem
Currently the onboarding checklist is only visible to owners. Two blockers prevent employees from seeing it:
1. `OnboardingChecklist.tsx` line 65 returns `null` if the user is not an owner
2. `useOnboardingProgress.ts` uses the logged-in user's own ID for all queries -- for employees, this is wrong since their milestones should reflect the owner's company data

### Changes

**1. `src/hooks/useOnboardingProgress.ts`** -- Resolve the correct company owner ID

- Query the `users` table to get the current user's profile
- If the user is an owner, use their own ID (as today)
- If the user is an employee, use their `home_builder_id` (the owner's ID) for all milestone queries
- This ensures employees see the same checklist progress as the owner

**2. `src/components/OnboardingChecklist.tsx`** -- Remove owner-only gate

- Change `if (isLoading || !isOwner) return null;` to `if (isLoading) return null;`
- This lets employees (and accountants, PMs, etc.) see the checklist too
- The dismiss behavior and completion dialog will work the same for all users

### How It Will Work

- All company members (owner, employees, accountants) see the same checklist on the dashboard
- Progress reflects the owner's company data (cost codes, projects, etc.) regardless of who is viewing
- Any team member can click "Go" to navigate to the relevant settings page and help complete a step
- The dismiss/completion state is still per-user via the `onboarding_progress` table

### Files Modified
1. `src/hooks/useOnboardingProgress.ts` -- Add query to resolve company owner ID; use it for all milestone queries
2. `src/components/OnboardingChecklist.tsx` -- Remove `!isOwner` visibility check

### Risk
Low. The milestone queries already use `owner_id` / `home_builder_id` filters, so using the correct owner ID will return the same data the owner sees. No RLS changes needed since employees already have read access to these tables via their `home_builder_id`.

