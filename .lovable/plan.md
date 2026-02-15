

## Fix: Branded Verification Email Not Sending

### What Went Wrong

The `send-signup-emails` edge function was never deployed after the last code update. That's why you received only the default Supabase plain-text confirmation email (the raw URL you see in the screenshot) and no branded email from BuilderSuite ML.

### Fix

**1. Deploy the `send-signup-emails` edge function**
- The code is already written and correct -- it just needs to be deployed so it actually runs when called.

**2. Suppress the default Supabase confirmation email**
- Right now, Supabase sends its own plain "Confirm Your Email" with just a raw link. Since our edge function sends the branded version with the verification link via Resend, we need to prevent the duplicate default email.
- Update the signup call in `SignupForm.tsx` to use `autoConfirm`-style flow: Instead of relying on Supabase's built-in email, the edge function already calls `auth.admin.generateLink()` which handles verification. We should disable Supabase's default confirmation email by **not** triggering it.
- Specifically, in `SignupForm.tsx`, after calling `supabase.auth.signUp()`, the edge function handles the branded email. The default Supabase email is controlled by the SMTP/template settings in the Supabase dashboard. Since we can't change dashboard settings from code, the user will temporarily receive both emails until the Supabase template is updated -- but the branded one will be the professional one.

**3. Delete the test user again and re-test**
- Delete `buildersuiteai1@gmail.com` from auth and public tables so you can sign up fresh and verify the branded email arrives.

### Steps

1. Deploy the edge function
2. Delete the test user (same admin cleanup as before)  
3. Re-sign up to verify the branded email arrives

### Technical Detail

The code in `send-signup-emails/index.ts` is correct -- it generates the verification link via `auth.admin.generateLink({ type: 'signup' })` and sends a branded HTML email via Resend. The only issue was deployment.

