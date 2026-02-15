

## Branded Verification Email for Home Builders

### Problem
After a home builder signs up, Supabase sends a plain, unstyled default confirmation email. The user wants a branded email matching the BuilderSuite ML style (black header, white card, styled button, footer) -- built entirely in code, no Supabase Dashboard changes needed.

### Approach
Instead of relying on Supabase's default confirmation email template (which requires dashboard edits), we'll use the same pattern as the employee invitation flow: generate the verification link server-side using the Admin API, then send a branded email via Resend.

### Changes

**Modified: `supabase/functions/send-signup-emails/index.ts`**
- After receiving the signup notification, use `supabase.auth.admin.generateLink({ type: 'signup', email })` to generate the email confirmation URL (same pattern used in `send-employee-invitation`)
- Replace the current plain welcome email with a branded "Verify Your Email" email that includes:
  - Black header with "Verify Your Email" title and company name
  - White card body with welcome text and a prominent black "Verify Your Email" button linking to the confirmation URL with redirect to `/auth`
  - "What happens next?" section (verify email, sign in, set up company)
  - Standard footer with www.buildersuiteai.com link
- The admin notification email stays as-is
- Only applies to `home_builder` user type (marketplace vendor flow unchanged)

**No changes needed to:**
- `SignupForm.tsx` -- already calls `send-signup-emails` after signup
- `Auth.tsx` -- already shows the success screen
- Supabase Dashboard -- everything is handled in code

### How it works
1. User fills out signup form, client calls `supabase.auth.signUp()` (Supabase sends its default email)
2. Client also calls the `send-signup-emails` edge function
3. Edge function generates a proper confirmation link via Admin API
4. Edge function sends a branded email via Resend with the confirmation link
5. User clicks the branded email's "Verify Your Email" button
6. User lands on the `/auth` sign-in page, verified and ready to log in

The user will receive two emails (the default Supabase one and our branded one). The branded one will be the professional-looking one they'll naturally click. Over time, the default Supabase template can optionally be simplified in the dashboard, but it's not required.

