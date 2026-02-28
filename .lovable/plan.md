

## Add Welcome Message Step + Reset Erica Gray Homes

### Overview

Add a new onboarding step #2 called "Confirm Welcome Message" between "Verify Email" and "Set Up Company Profile." When a new user first signs in and their email is verified but they haven't confirmed the welcome message yet, a dialog appears with an important message about following the 8-step startup workflow. Closing the dialog marks the step complete. Total steps go from 7 to 8.

Also: delete Erica Gray Homes' onboarding_progress row so the account is fresh for retesting.

### Changes

**1. Database migration: Add `welcome_confirmed` column to `onboarding_progress`**
- Add `welcome_confirmed BOOLEAN NOT NULL DEFAULT FALSE` to the `onboarding_progress` table
- Delete the existing onboarding_progress row for Erica Gray Homes (`home_builder_id = 'bfdbd789-0cd2-4b79-bc5f-51d28e2a3bc4'`) so she can retest from scratch

**2. Update `useOnboardingProgress` hook**
- Add `welcome_confirmed` to the `liveChecks` query -- read it directly from the `onboarding_progress` row (not a live check like the others, since it's a one-time manual action)
- Add the new step at position #2 in the steps array: `{ key: "welcome_confirmed", label: "Confirm Welcome Message", completed: ..., action: "welcome-dialog" }`
- Add `welcome_confirmed` to the sync fields list
- Expose a new `confirmWelcome` function that updates the `onboarding_progress` row to set `welcome_confirmed = true`

**3. Update `OnboardingChecklist` component**
- Add a `welcomeDialogOpen` state
- Handle the `"welcome-dialog"` action in `handleAction` to open the dialog
- Auto-open the dialog when email is verified but welcome is not confirmed (so it appears on first login)
- Render a welcome dialog with:
  - Title: "Welcome to BuilderSuiteML!"
  - Body explaining the importance of completing all 8 setup steps
  - A "Got It" button that calls `confirmWelcome()` and closes the dialog
- Update the column split (now 4/4 instead of 4/3)

**4. Update the congratulations message**
- Update the text to reference "BuilderSuiteML" instead of "BuilderSuite"

### Technical Details

The welcome dialog will auto-trigger when:
- `email_verified === true`
- `welcome_confirmed === false`
- The onboarding checklist is visible (not dismissed, not all complete)

This ensures it only pops up once, right after email verification, and the user must acknowledge it before proceeding. The "Go" button on the step also opens the dialog manually if they somehow skipped it.

The `confirmWelcome` function will:
```text
UPDATE onboarding_progress
SET welcome_confirmed = true
WHERE home_builder_id = effectiveOwnerId
```

No new edge functions or external dependencies needed.

