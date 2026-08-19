# Fix every email function at once

## Is it external? Yes.

Nothing in the app changed. The backend functions load their libraries from the public CDN `esm.sh` at startup. That CDN changed how it builds the Supabase and Resend packages, and the new build pulls in a Node-only websocket module that the Supabase edge runtime cannot load. The function then crashes before a single line of email code runs — which is why things that worked for a year "broke on their own."

That is exactly the failure already fixed one-by-one in `send-po-email`, `send-bid-package-email`, and `share-redirect`. The same broken import is still present in 58 functions, including every remaining email sender.

## The one-time fix

Sweep all remaining functions off `esm.sh` and onto Deno's native `npm:` package specifiers, which do not go through that CDN.

Confirmed functions still on the broken imports include the email senders:
`send-accounting-reports`, `send-bid-reminders`, `send-bid-submission-email`, `send-employee-approved-email`, `send-employee-invitation`, `send-invoice-email`, `send-issue-closure-email`, `send-marketplace-message`, `send-password-reset`, `send-schedule-notification`, `send-signup-emails`, `send-subscription-invoice-email`
plus non-email functions on the same fragile imports (Stripe billing, bill/lot splitting, bid submission, etc.).

### What changes in each file
- `https://esm.sh/@supabase/supabase-js@...` becomes `npm:@supabase/supabase-js@2`
- `https://esm.sh/resend@4.0.0` becomes `npm:resend@4`
- `https://esm.sh/stripe@18.5.0` becomes `npm:stripe@18`
- The legacy `deno.land/std/http/server.ts` `serve()` startup wrapper becomes the runtime-native `Deno.serve`

Nothing else is touched: no email wording, no recipients, no sender address, no business logic, no database, no frontend.

## Order of work
1. Email senders first (the 12 above), since those are the live pain.
2. Then the remaining functions on the same imports, so this cannot resurface next month.
3. Deploy and read the function logs to confirm each boots cleanly.
4. Send one real test email (PO or bid invite) and confirm a success response from Resend.

## Risk
Low. This is an import-path change only, and the identical change is already proven working in the three functions repaired this week.
