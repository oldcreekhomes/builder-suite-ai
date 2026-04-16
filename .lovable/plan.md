
## Fix shared links after AI→ML domain change

### What’s actually wrong
The share link itself is fine. The problem is the redirect destination.

Right now `share-redirect` sends users to:

```text
https://app.buildersuiteml.com/s/f/:shareId
```

But this project’s connected ML domains are:

```text
https://buildersuiteml.com
https://www.buildersuiteml.com
```

There is no connected `app.buildersuiteml.com` domain in the current project URLs, so the redirect lands on a host that does not exist.

That matches exactly what you’re seeing:
- share link generates
- redirect runs
- browser lands on `app.buildersuiteml.com/...`
- destination fails

### Minimal fix
Update the deployed redirect target to the live ML domain that already exists:

**File:** `supabase/functions/share-redirect/index.ts`

Change:

```ts
const targetOrigin = "https://app.buildersuiteml.com";
```

to:

```ts
const targetOrigin = "https://buildersuiteml.com";
```

This is the least risky fix because:
- your public share routes already exist at `/s/f/:shareId` and `/s/p/:shareId`
- nothing in the frontend routing requires the `app.` subdomain
- it only corrects the one thing that changed during the domain rename

### Implementation steps
1. Update the hardcoded target origin in `share-redirect`
2. Redeploy only the `share-redirect` edge function
3. Test your exact sample link and confirm it now redirects to:
   - `https://buildersuiteml.com/s/f/6bwkkpcuflji06rjj0btv8`
4. Open the shared page and verify file download still works

### Technical notes
- I checked the router: both public routes already exist in `src/App.tsx`
  - `/s/f/:shareId`
  - `/s/p/:shareId`
- I checked the current project domain list: ML root domain exists, ML `app.` subdomain does not
- I also checked the codebase for `app.buildersuiteml.com` and found the relevant share redirect usage in only one place

### Scope
- Backend only
- Single-file fix
- No UI changes
- No share-generation logic changes
- No database changes
