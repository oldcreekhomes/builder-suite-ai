
## Root Cause

Files in `project_bid_packages.files` are stored in **two different formats**:

1. **Full path** (newer/correct): `bidding/691271e6-.../1776435435139-Architctecurals Lots 13-19_03.27.26.pdf`
2. **Bare filename** (legacy/uploader-stamped): `bidding_a589c0d4-..._1776454188404_Architctecurals Lots 13-19_03.27.26.pdf`

When a file is opened, the code does this:

```ts
// getProjectFileStoragePath (in BiddingTableRowFiles, etc.)
if (fileRef.includes('/')) return fileRef;     // keeps "bidding/.../filename.pdf"
return `specifications/${fileRef}`;             // wraps bare filenames

// then openSpecificationFile (in useUniversalFilePreview.ts)
const finalPath = `specifications/${normalizedPath}`;  // ← always prepends "specifications/"
```

So a file already stored at `bidding/691271.../foo.pdf` becomes `specifications/bidding/691271.../foo.pdf` → **404, object not found**.

Confirmed in DB:
- ✅ Exists: `bidding/691271e6-.../1776435435139-Architctecurals Lots 13-19_03.27.26.pdf`
- ❌ Requested: `specifications/bidding/691271e6-.../1776435435139-Architctecurals Lots 13-19_03.27.26.pdf`

That's why it's intermittent — files saved via the older "upload to specifications" path work, files saved via the newer "pick from project files" path (which keeps the original `bidding/...` path) fail.

It's **not** related to the URL/domain change.

## Fix

Make `openSpecificationFile` smart about whether the path already points to a real storage location, instead of blindly prepending `specifications/`.

Logic:
- If path starts with `specifications/`, `bidding/`, `proposals/`, `purchase-orders/`, or any other top-level storage folder → use as-is.
- Only prepend `specifications/` for bare filenames (no `/`).
- Strip any accidental `project-files/` bucket prefix.

### File to edit
- `src/hooks/useUniversalFilePreview.ts` — rewrite the `openSpecificationFile` normalization block.

### Optional cleanup (not required to fix the bug)
The four duplicate `getProjectFileStoragePath` helpers in bidding modals could be unified later, but since the central hook will handle normalization correctly, the bug is fixed regardless.

## Out of scope
No DB migration. No bucket/permission changes. No UI changes. Pure path-normalization fix.
