

# Onboarding Checklist Fixes

## Three Changes

### 1. Fix "Confirm Welcome Message" not checking off

**Root cause**: In `useOnboardingProgress.ts` (line 85), the `welcome_confirmed` status is read from `progressRow?.welcome_confirmed` inside the `liveChecks` query. When the user clicks "Got It", the `confirmWelcome` function updates the database and invalidates both queries, but there is a race condition: `liveChecks` may re-fetch before `progressRow` has refreshed, so it reads the stale value and the checkmark never appears.

**Fix**: In the `liveChecks` query function, fetch `welcome_confirmed` directly from the `onboarding_progress` table instead of relying on the captured `progressRow` variable. This eliminates the stale closure issue.

**File**: `src/hooks/useOnboardingProgress.ts`
- Add a query to `onboarding_progress` inside the `Promise.all` in `liveChecks` to get the current `welcome_confirmed` value directly
- Replace `progressRow?.welcome_confirmed === true` with the fresh DB result

### 2. Update heading text

**File**: `src/components/OnboardingChecklist.tsx` (line 128)
- Change `"Get Started with BuilderSuiteML"` to `"Get Started with BuilderSuiteML Onboarding Process"`

### 3. Add green checkmark for completed steps (replacing Go button area)

Currently, completed steps show a filled circle + strikethrough text on the left, but the right side where the "Go" button was is empty. The user wants a green checkmark icon (like the `CheckCircle2` used in ProjectBidsCard and ProjectWarnings) to appear on the right side when a step is done.

**File**: `src/components/OnboardingChecklist.tsx`
- Import `CheckCircle2` from `lucide-react`
- In the `StepItem` component, add an `else` branch: when `step.completed`, render a `CheckCircle2` icon (`h-5 w-5 text-green-500`) on the right side where the "Go" button normally sits

