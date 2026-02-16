

## Add Onboarding Completion Congratulations Dialog

### Overview
When all 7 onboarding steps are completed, instead of silently hiding the checklist, show a congratulations dialog. The user must dismiss it manually, and once dismissed, the checklist disappears for good.

### Changes

**1. Add a `dismissed` flag to `onboarding_progress` table (database migration)**
- Add column `dismissed BOOLEAN DEFAULT FALSE` to `onboarding_progress`
- This ensures the congratulations dialog only shows once -- after dismissal, the checklist never reappears

**2. Update `useOnboardingProgress` hook (`src/hooks/useOnboardingProgress.ts`)**
- Expose `dismissed` (from the progress row) and a `dismiss()` mutation that sets `dismissed = true` in the database
- Return these in the hook's result so the checklist component can use them

**3. Update `OnboardingChecklist` (`src/components/OnboardingChecklist.tsx`)**
- Current behavior: `if (allComplete) return null` -- silently hides
- New behavior:
  - If `allComplete` and NOT `dismissed`: show a congratulations Dialog
  - If `allComplete` and `dismissed`: return null (hide permanently)
- The congratulations dialog will contain:
  - A party/confetti icon (PartyPopper from lucide-react)
  - Title: **"Congratulations!"**
  - Body text: "You've completed all the setup steps for BuilderSuite. You're all set to start managing your projects. If you ever need help, don't hesitate to reach out to our support team."
  - A single "Close" button that calls the `dismiss()` mutation

### User Experience
1. User completes the final onboarding step
2. On returning to the dashboard, a dialog pops up congratulating them
3. They read the message, click "Close"
4. The dialog and checklist are permanently hidden
