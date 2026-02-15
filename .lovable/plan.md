

## Fix: Full-Screen "Check Your Email" Confirmation After Signup

### Problem
After a home builder signs up, they see a tiny toast notification in the bottom-right corner saying "Account created!" and get immediately redirected to the homepage. The user will almost certainly miss this.

### Solution
Replace the toast + redirect with a full-screen confirmation page (same pattern already used in `MarketplaceSignup.tsx`).

### Changes

**Modified file: `src/components/auth/SignupForm.tsx`**
- Add a `showSuccess` state (boolean, default false)
- On successful signup, set `showSuccess = true` instead of showing a toast and navigating away
- When `showSuccess` is true, render a centered confirmation card with:
  - A checkmark icon
  - "Check Your Email!" heading
  - The user's email address highlighted
  - Instructions to click the verification link
  - A "What happens next?" section listing the steps
  - A "Go to Sign In" button linking to `/auth`

**Modified file: `src/pages/Auth.tsx`**
- Pass through a mechanism so that when `SignupForm` triggers its success state, the full Auth page renders the success view (since `SignupForm` is nested inside `Auth`'s card/tabs layout). The cleanest approach: lift the success state up so the entire Auth page can be replaced by the success screen, avoiding it being trapped inside the tab card.

### What the user sees after signing up
A clean, centered card in the middle of the screen with:
- A green checkmark icon
- "Check Your Email!" title
- "We've sent a verification link to **you@company.com**"
- Next steps list
- Button to go to Sign In

This matches the existing `MarketplaceSignup` success screen pattern for consistency.
