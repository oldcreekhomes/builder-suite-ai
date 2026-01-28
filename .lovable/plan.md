

## Fix Share Link Redirect Domain

### Problem
The `share-redirect` edge function is redirecting users to `https://buildersuite.com`, but your Lovable app is actually published at `https://builder-suite-ai.lovable.app`. The `buildersuite.com` domain doesn't host your app's routes like `/s/f/:shareId`, so users get a 404 error.

### Root Cause
Line 66 in `share-redirect/index.ts`:
```typescript
const targetOrigin = originParam || "https://buildersuite.com"; // fallback to brand domain
```

Since we just removed the `origin` parameter from share links, the edge function now always falls back to `buildersuite.com` - which is wrong.

### Solution
Update the fallback domain in the edge function to use your actual published Lovable app URL.

---

### Technical Implementation

**File:** `supabase/functions/share-redirect/index.ts`

**Line 66 - Change from:**
```typescript
const targetOrigin = originParam || "https://buildersuite.com"; // fallback to brand domain
```

**To:**
```typescript
const targetOrigin = originParam || "https://builder-suite-ai.lovable.app"; // fallback to published app
```

---

### Alternative: Custom Domain Setup

If you have a custom domain (like `app.buildersuite.com`) configured to point to your Lovable app, you could use that instead:

```typescript
const targetOrigin = originParam || "https://app.buildersuite.com";
```

But this requires setting up the custom domain in Lovable's settings first.

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/share-redirect/index.ts` | Update fallback domain from `buildersuite.com` to `builder-suite-ai.lovable.app` |

---

### Result After Fix

- **Current behavior**: Redirects to `https://buildersuite.com/s/f/...` → 404 error
- **New behavior**: Redirects to `https://builder-suite-ai.lovable.app/s/f/...` → Shows shared files correctly

---

### Future Consideration

Once you set up a custom domain in Lovable (like `app.buildersuite.com`), you can update this redirect URL to use your branded domain instead.

