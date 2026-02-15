

## Simplify the Home Builder Verification Email

### What Changes

The verification email sent to new home builders will be stripped down to just the essentials:

**Remove:**
- The company name subtitle below "Verify Your Email" in the black header
- The "Thank you for signing up" line
- The "Your account for **Company** has been created" paragraph
- The entire "What happens next?" section (steps 1-3)
- The "A member of our team will be reaching out" line

**Keep:**
- The black header with just "Verify Your Email"
- A single line: "Please verify your email address by clicking the button below."
- The "Verify Your Email" button
- The footer with the website link

### Result

The email will look like:

```text
+------------------------------------+
|        [BLACK HEADER]              |
|      Verify Your Email             |
+------------------------------------+
|                                    |
|  Please verify your email address  |
|  by clicking the button below.     |
|                                    |
|      [ Verify Your Email ]         |
|                                    |
+------------------------------------+
|      www.buildersuiteai.com        |
+------------------------------------+
```

### Technical Detail

**File:** `supabase/functions/send-signup-emails/index.ts`

Edit the `buildHomeBuilderVerificationHtml` function (lines 99-200):

1. Remove the company name `<p>` tag from the black header (line 116)
2. Replace all the body content rows (lines 124-177) with a single row containing "Please verify your email address by clicking the button below." followed by the button
3. Remove the "A member of our team..." paragraph (lines 182-184)
4. Redeploy the `send-signup-emails` edge function

No other files need to change -- the function signature stays the same, just the HTML template output is simplified.

