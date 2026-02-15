

## Fix Onboarding Go Buttons: Correct Destinations and Prominent Styling

### Changes

**1. Update step links to point to correct Settings tabs (`src/hooks/useOnboardingProgress.ts`)**

Currently all three settings-related steps link to `/settings`, which always opens the default "Company Profile" tab. Update:
- "Import Cost Codes" link to `/settings?tab=cost-codes`
- "Import Chart of Accounts" link to `/settings?tab=chart-of-accounts`
- "Create First Project" will use a special action value (e.g., `action: "new-project"`) instead of a link, so it opens the New Project dialog on the dashboard

**2. Make Settings page read tab from URL query params (`src/pages/Settings.tsx`)**

The Settings page currently uses `defaultValue="company-profile"` with no URL awareness. Update it to:
- Read `?tab=` from the URL search params on mount
- Use that as the active tab (falling back to `company-profile` if not present)

**3. Handle "Create First Project" as a dialog trigger (`src/components/OnboardingChecklist.tsx`)**

- Import and use the `NewProjectDialog` component
- When the "Create First Project" Go button is clicked, open the dialog instead of navigating
- Add `onSuccess` handling to invalidate onboarding queries when a project is created

**4. Restyle the Go button to be more prominent (`src/components/OnboardingChecklist.tsx`)**

Change the button from `variant="outline"` to a black background with white text and arrow, using `className="bg-black hover:bg-gray-800 text-white"` to match the existing "New Project" button style in the header.

### Files to modify

- `src/hooks/useOnboardingProgress.ts` -- update step links
- `src/pages/Settings.tsx` -- read tab from URL query param
- `src/components/OnboardingChecklist.tsx` -- New Project dialog integration, button restyling
