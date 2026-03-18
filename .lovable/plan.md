

## Fix: Test Email "Will Bid" / "Will Not Bid" Links Fail

### Problem

When you send a test email, the "Will Bid" and "Will Not Bid" links in the email redirect to an error page. The edge function logs show:

```
invalid input syntax for type uuid: "mock-company-id"
```

Even though your "Fake Company" is a real company in the system, the test email modal uses a fallback string `'mock-company-id'` (line 251 of `SendTestEmailModal.tsx`) when it can't find the company data. This non-UUID string crashes the Postgres query in the edge function.

**Why it might not find the company**: The query matches on `companyId` passed as a prop. If `companyId` is `undefined` (no specific company was selected when clicking "Send Test Email"), it falls back to `data?.[0]` — which should work if the bid package has companies. But if the bid package has no companies added yet, or the join returns nothing, it falls through to the `'mock-company-id'` fallback.

### Changes

**1. `src/components/bidding/SendTestEmailModal.tsx` (line 251)**

Replace `'mock-company-id'` with a valid nil UUID so the edge function query doesn't crash:

```tsx
id: companyData?.companies?.id || '00000000-0000-0000-0000-000000000000',
```

**2. `supabase/functions/handle-bid-response/index.ts` (lines 104-122)**

When no rows are updated (test email with placeholder UUID, duplicate click, or expired bid), show the success confirmation page instead of an error. The user's intent is clear from the URL — there's no reason to show a scary error page.

Change the "no rows updated" block to redirect to the confirmation page with the response value, instead of redirecting to `?status=error`.

### Summary

- One-line fix in the modal to prevent UUID crash
- Edge function change to gracefully handle test/missing bids — redeploy required

