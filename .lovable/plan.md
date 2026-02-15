

## Fix: Replace Default Supabase Email with Branded Verification Email

### Problem

The current signup flow calls `supabase.auth.signUp()` on the client side. This **always** triggers Supabase's built-in confirmation email -- the plain text one with just a raw URL (what you're seeing). Our edge function then tries to send a second branded email, but even when it works, you'd receive two emails. In this case, it also hit a Resend rate limit (429 error) and the branded one never sent at all.

### Solution

Follow the same pattern used by the password reset and employee invitation flows: move user creation entirely to the edge function using the Supabase Admin API. This way Supabase never sends its default email.

### How It Works

1. **Client (`SignupForm.tsx`)**: Instead of calling `supabase.auth.signUp()`, call the `send-signup-emails` edge function with the user's email, password, and company name
2. **Edge Function (`send-signup-emails/index.ts`)**: 
   - Create the user via `auth.admin.createUser({ email, password, email_confirm: false })` -- this creates the user WITHOUT triggering any Supabase default email
   - Generate the verification link via `auth.admin.generateLink({ type: 'signup' })`
   - Send the branded verification email via Resend
   - Send the admin notification email via Resend
3. **Result**: Only ONE email arrives -- the branded BuilderSuite ML verification email with the styled button

### Files Changed

**`src/components/auth/SignupForm.tsx`**
- Remove the direct `supabase.auth.signUp()` call
- Pass email, password, and company name to the edge function instead
- Keep the company name duplicate check (client-side)
- Keep the success/error handling and UI flow the same

**`supabase/functions/send-signup-emails/index.ts`**
- Accept `password` in the request body
- Use `auth.admin.createUser()` to create the user with metadata (user_type, company_name) and `email_confirm: false`
- Keep the existing `auth.admin.generateLink()` call to generate verification URL
- Add a small delay between the admin email and user email sends to avoid Resend rate limits (429)
- Keep all existing branded HTML templates unchanged

### Technical Detail

The key difference from the current broken flow:

```text
CURRENT (broken):
  Client: supabase.auth.signUp() --> Supabase sends DEFAULT plain email
  Client: invoke edge function --> Edge function tries branded email (rate limited / duplicate)

FIXED:
  Client: invoke edge function only
  Edge function: admin.createUser() --> NO default email sent
  Edge function: admin.generateLink() --> Get verification URL
  Edge function: resend.emails.send() --> Send ONE branded email
```

This matches exactly how `send-password-reset` works: bypass Supabase's default emails entirely and handle everything through the edge function with Resend.

### Additional Cleanup

- Delete the test user `buildersuiteai1@gmail.com` again for a fresh re-test after deploying
