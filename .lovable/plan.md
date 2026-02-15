

## Home Builder Onboarding Progress Tracker

### The Problem

When a new home builder signs up, there are several critical setup steps they need to complete before the platform is fully useful. Currently there's no way to track which steps they've done, remind them of what's left, or for you (as the platform admin) to see where each builder is in the process.

### What We'll Build

**1. A new `onboarding_progress` database table** that tracks each home builder's completion of key milestones:

| Milestone | How It's Detected |
|---|---|
| Email Verified | Automatically when they click "Verify Your Email" |
| Company Profile Set Up | HQ address filled in on their profile |
| Cost Codes Imported | At least one cost code exists for this builder |
| Chart of Accounts Imported | At least one account exists for this builder |
| Subcontractors (Companies) Added | At least one company record exists |
| First Project Created | At least one project exists |
| Employees Invited | At least one employee user exists under their ID |

**2. An Onboarding Checklist Card on the Dashboard** -- a prominent card shown to home builder owners on their dashboard that displays:
- A progress bar (e.g., "3 of 7 steps complete")
- A checklist of all milestones with checkmarks for completed ones
- Clickable links on incomplete items that navigate to the relevant page (e.g., "Import Cost Codes" links to Settings > Cost Codes)
- The card automatically hides once all steps are complete

**3. Automatic Progress Detection** -- a hook that checks the database on each dashboard load to see which milestones are met, updating the `onboarding_progress` table as steps are completed (no manual marking needed).

### How It Looks on the Dashboard

When a home builder logs in and hasn't completed all steps, they'll see a card at the top of their dashboard:

```text
+----------------------------------------------+
|  Get Started with BuilderSuite        3/7     |
|  =============================----  (43%)     |
|                                               |
|  [x] Email Verified                           |
|  [x] Company Profile                          |
|  [x] Import Cost Codes                        |
|  [ ] Import Chart of Accounts  --> Go         |
|  [ ] Add Subcontractors        --> Go         |
|  [ ] Create First Project      --> Go         |
|  [ ] Invite Employees          --> Go         |
+----------------------------------------------+
```

Once all 7 items are checked, the card disappears from the dashboard.

### Technical Details

**Database: New `onboarding_progress` table**

```text
- id (uuid, primary key)
- home_builder_id (uuid, references public.users, unique)
- email_verified (boolean, default false)
- company_profile_completed (boolean, default false)
- cost_codes_imported (boolean, default false)
- chart_of_accounts_imported (boolean, default false)
- companies_added (boolean, default false)
- first_project_created (boolean, default false)
- employees_invited (boolean, default false)
- created_at (timestamptz)
- updated_at (timestamptz)
```

RLS policies: Only the home builder (owner) can read/update their own row.

A row is automatically created when a new home builder signs up (via a trigger on the `users` table or lazily on first dashboard load).

**New Files:**
- `src/hooks/useOnboardingProgress.ts` -- Hook that queries the onboarding_progress table AND checks live data (cost_codes count, companies count, etc.) to auto-detect completed steps
- `src/components/OnboardingChecklist.tsx` -- The dashboard card component with progress bar and checklist

**Modified Files:**
- `src/pages/Index.tsx` -- Add the OnboardingChecklist card above the existing dashboard grid, shown only for home builder owners with incomplete onboarding
- `supabase/functions/send-signup-emails/index.ts` (or a trigger) -- Mark `email_verified` as true when the user confirms their email

**Detection Logic (in the hook):**
1. Query `onboarding_progress` for current user
2. If no row exists, create one
3. Check each milestone against live data:
   - `email_verified`: user's `confirmed` field in `public.users` is true
   - `company_profile_completed`: user has `hq_address` filled in
   - `cost_codes_imported`: COUNT of cost_codes where owner_id = user > 0
   - `chart_of_accounts_imported`: COUNT of accounts where owner_id = user > 0
   - `companies_added`: COUNT of companies where home_builder_id = user > 0
   - `first_project_created`: COUNT of projects where owner_id = user > 0
   - `employees_invited`: COUNT of users where home_builder_id = user AND user_type = 'employee' > 0
4. Auto-update any newly completed milestones in the table
5. Return the progress data to the UI

