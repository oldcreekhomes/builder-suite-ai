

## Remove "lovableproject.com" from Share Links

### Problem
When generating share links, the code uses `window.location.origin` to capture the current browser URL. When you're working in the Lovable preview environment, this captures the preview domain (`7f4eccd7-6d58-465f-a474-4c0fb79b4bab.lovableproject.com`), which gets embedded into the share link.

The `share-redirect` edge function then uses this origin to redirect users, exposing the Lovable branding.

### Solution
Instead of using `window.location.origin` (which varies based on where you're viewing the app), we should use your **published production domain**. The edge function already has a fallback to `buildersuite.com`, so the fix is to:

1. **Remove the `origin` parameter entirely** from the share link generation
2. **Let the edge function always use the fallback** (`https://buildersuite.com`)

This ensures that no matter where you generate the share link (preview, production, or anywhere else), the recipient always gets redirected to your brand domain.

---

### Technical Implementation

#### Files to Modify

| File | Change |
|------|--------|
| `src/components/files/components/FolderShareModal.tsx` | Remove `&origin=${encodeURIComponent(window.location.origin)}` from share URLs |
| `src/components/files/components/FileShareModal.tsx` | Remove `&origin=${encodeURIComponent(window.location.origin)}` from share URLs |
| `src/components/photos/components/FolderShareModal.tsx` | Remove `&origin=${encodeURIComponent(window.location.origin)}` from share URLs |

#### Changes in Each File

**Before (example from FolderShareModal.tsx lines 65 and 109):**
```typescript
const shareUrl = `${baseUrl}?id=${existingShare.share_id}&type=f&origin=${encodeURIComponent(window.location.origin)}`;
```

**After:**
```typescript
const shareUrl = `${baseUrl}?id=${existingShare.share_id}&type=f`;
```

The edge function already handles this gracefully:
```typescript
// Line 66 in share-redirect/index.ts
const targetOrigin = originParam || "https://buildersuite.com"; // fallback to brand domain
```

When no `origin` parameter is provided, it defaults to `https://buildersuite.com`.

---

### Result

- **Current behavior**: Share link redirects to `https://7f4eccd7-6d58-465f-a474-4c0fb79b4bab.lovableproject.com/s/f/...`
- **New behavior**: Share link redirects to `https://buildersuite.com/s/f/...`

---

### Alternative (if you have a custom domain)

If you've connected a custom domain in Lovable (like `app.buildersuite.com`), you could hardcode that instead. But since the edge function already defaults to `buildersuite.com`, the simplest fix is just removing the origin parameter entirely.

---

### Summary

This is a 3-file change that removes `&origin=${encodeURIComponent(window.location.origin)}` from share link generation, ensuring all share links redirect to your branded domain instead of the Lovable preview domain.

