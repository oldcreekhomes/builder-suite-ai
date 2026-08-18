# Fix: "Failed to send purchase order email"

## What is actually happening

The PO email never sent. The confirmation toast you saw is optimistic — the app shows "Sending…" and closes the dialog, then the background call fails and shows the red error.

The edge function logs confirm the send-po-email function crashes at boot, before any email logic runs:

```text
module "node:url" not found
event loop error: TypeError: Cannot destructure property 'URL' ...
  at https://esm.sh/ws@8.21.3/denonext/ws.mjs
```

The function imports the Supabase client from `https://esm.sh/@supabase/supabase-js@2.50.0`. esm.sh recently started resolving that to a build that pulls the `ws` websocket package, which requires Node's `node:url` — not available in the edge runtime. Nothing in the app changed; the CDN's resolution did. That's why it broke "on its own".

The same crash is in the bid package email function, so bid invitations are silently failing too.

## The fix

1. Change the Supabase client import in `send-po-email` from the esm.sh URL to the Deno-native `npm:@supabase/supabase-js@2` specifier, which does not drag in `ws`.
2. Apply the same change to `send-bid-package-email` (it is failing identically), and to the `resend` import there.
3. Leave all email content, PDF stamping, recipient resolution and business logic untouched.
4. After deploy, send a PO from Nob Hill and read the function logs to confirm a clean boot and a Resend success response.

## Follow-up (optional, not part of this fix)

The other ~45 functions use the same esm.sh import and are one CDN change away from the same failure. Once the PO email is confirmed working, I can sweep them to `npm:` specifiers in a separate pass.
