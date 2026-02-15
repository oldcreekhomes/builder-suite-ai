

## Branded "Confirm Your Email" Template + Redirect Fix

### Problem
The Supabase Auth confirmation email is a plain, unstyled link with no branding. It should match the BuilderSuite ML email style (black header, clean card layout, branded footer) used in all other email functions. Additionally, the redirect after clicking the link should go to the sign-in page (`/auth`), not the homepage.

### Two Changes Required

#### 1. Update redirect URL in code (Lovable handles this)

**File: `src/components/auth/SignupForm.tsx`** (line 57)
- Change `emailRedirectTo` from `${window.location.origin}/` to `${window.location.origin}/auth`
- This ensures after email verification, the user lands on the sign-in page

**File: `src/pages/MarketplaceSignup.tsx`** (line 74)
- Same change: redirect to `/auth` instead of `/`

#### 2. Update Supabase Auth email template (you do this in the dashboard)

The confirmation email template is stored in the **Supabase Dashboard**, not in the codebase. After I make the code change above, you will need to:

1. Go to your Supabase Dashboard > Authentication > Email Templates
2. Select the **"Confirm signup"** template
3. Replace the current template body with the branded HTML I will provide (matching your black header / white card / footer pattern used in all other BuilderSuite ML emails)
4. The template will include a styled "Verify Your Email" button using the `{{ .ConfirmationURL }}` variable that Supabase provides

I will provide the full HTML template for you to paste into the dashboard.

### What the user will see after this change
- A professionally branded email with the BuilderSuite ML header
- A clear "Verify Your Email" button (not a raw link)
- After clicking the button, they land on the sign-in page at `/auth`
