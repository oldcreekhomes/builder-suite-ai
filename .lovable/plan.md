

## Update Share-Redirect to Use Custom Domain

### Summary
Now that `app.buildersuiteai.com` is connected and active, I'll update the edge function to always redirect to your custom domain instead of the Lovable URL.

### Technical Implementation

**File:** `supabase/functions/share-redirect/index.ts`

**Line 66 - Change from:**
```typescript
const targetOrigin = originParam || "https://builder-suite-ai.lovable.app"; // fallback to published app
```

**To:**
```typescript
const targetOrigin = "https://app.buildersuiteai.com"; // always use custom domain
```

Note: I'm removing the `originParam` fallback entirely since you selected "Always custom domain" - this ensures share links always go to your branded domain regardless of any origin parameter.

---

### Result

| Before | After |
|--------|-------|
| `https://builder-suite-ai.lovable.app/s/f/...` | `https://app.buildersuiteai.com/s/f/...` |

No more "lovable.app" in your share links!

