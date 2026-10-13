# Fix "Connect Bank" error (step 2)

## What happened
The first Plaid setting is fixed. Plaid now gives a different message: "OAuth redirect URI must be configured in the developer dashboard." Capital One sends you back to our app after you sign in, so Plaid needs a list of the web addresses it's allowed to send you back to.

**Your step in Plaid:** go to Developers -> API -> Allowed redirect URIs and add these addresses, then click Save:
- `https://app.buildersuiteai.com/plaid/oauth`
- `https://buildersuiteai.com/plaid/oauth`
- `https://builder-suite-ai.lovable.app/plaid/oauth`
- `https://id-preview--7f4eccd7-6d58-465f-a474-4c0fb79b4bab.lovable.app/plaid/oauth` (this one is for testing inside Lovable)

## How it will work (confirming your setup)
- **One Capital One sign-in.** Click Connect Bank once, sign in, and check every job's account. All of them get saved together.
- **Each job is linked to its own account** through the small link icon on its bank balance. You pick it once and the choice is remembered.
- **One refresh button** updates all accounts.

## App fixes
1. **Send you back to the right page:** after Capital One sign-in, you return to the same site you started on (the live site or the preview). Right now it's always the live site.
2. **No more red error box:** when Plaid refuses a request, the app shows a short message at the bottom of the screen saying what's missing, instead of the full-screen error.

## Technical details
- Client passes `redirect_uri: window.location.origin + "/plaid/oauth"` to `link_token`. The edge function only uses it if it matches an allowlist (the four origins above) and otherwise falls back to the app.buildersuiteai.com URI.
- Expected Plaid errors (bad configuration or a refused request) come back as HTTP 200 `{ error }` instead of 500, so the preview's runtime-error overlay doesn't fire. `invokePlaid` already turns `{ error }` into a toast. Real crashes still return 500.
