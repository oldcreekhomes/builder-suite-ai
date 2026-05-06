# Why the onboarding checklist is back

Your `onboarding_progress` row shows **7 of 8 complete** — every milestone is done, `dismissed = true`, but `welcome_confirmed = false`. The checklist component only hides itself when `allComplete && dismissed`. Since the welcome step never got flipped to true (it was added/changed after you already onboarded months ago), `allComplete` is false, so the dismissal is ignored and the card reappears.

In short: a step was added retroactively, your row was never backfilled, and the "dismissed" flag isn't respected unless every step is complete.

# Fix

**1. Backfill the welcome flag for existing users**
Migration: set `welcome_confirmed = true` on every `onboarding_progress` row created before today where the user has already completed substantive setup (e.g. `company_profile_completed = true` OR `dismissed = true`). This clears the false-positive for you and any other long-time owner in the same boat.

**2. Respect prior dismissal**
Update `OnboardingChecklist.tsx` so a row with `dismissed = true` stays hidden even if `allComplete` is false. Rationale: if the owner explicitly dismissed the checklist, adding a new step later shouldn't resurrect it. New steps can surface through other UX (banners, settings) without re-pestering established users.

# Technical details

- File: `supabase/migrations/<new>.sql`
  ```sql
  UPDATE public.onboarding_progress
     SET welcome_confirmed = true
   WHERE welcome_confirmed = false
     AND (dismissed = true OR company_profile_completed = true);
  ```
- File: `src/components/OnboardingChecklist.tsx`
  - Early-return `null` when `dismissed` is true (regardless of `allComplete`).
  - Keep the "all complete + not dismissed" congrats dialog branch unchanged.
- No changes to `useOnboardingProgress` API.

After this, your dashboard will stop showing the onboarding card. New owners still see the full 8-step flow.