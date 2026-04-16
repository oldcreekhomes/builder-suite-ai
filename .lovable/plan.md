

## Fix: Redeploy `share-redirect` Edge Function

### Problem
The source code in the repo already has the correct domain (`app.buildersuiteml.com`). However, the **deployed** edge function is stale and likely still points to the old retired domain. The shared file links fail because the live function redirects to a domain that no longer resolves.

### Fix
**No code changes needed.** The only action is to **redeploy** the `share-redirect` edge function so the live version matches the source code.

### Steps
1. Deploy edge function `share-redirect` using the deploy tool
2. Test the example link to confirm the redirect now goes to `https://app.buildersuiteml.com/s/f/qabg65mas7muxjkt1cxve`

