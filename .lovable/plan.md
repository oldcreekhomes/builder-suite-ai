## What's actually going on

Your photo grid is loading the **full-resolution originals** for every tile. iPhone JPGs like `IMG_2217.JPG` are typically 3–6 MB each. With 60+ photos in the folder, that's hundreds of MB the browser has to pull just to render thumbnails — which is exactly why you see two pictures appear and then nothing for a long time.

There's already a `getThumbnailUrl()` helper (`src/utils/thumbnailUtils.ts`) that uses Supabase's on-the-fly image resize endpoint (`/render/image/public/...?width=512&quality=80`). It's imported in `PhotoCard.tsx` but **never actually used** — the `<img>` tag points to `photo.url` (the original).

On top of that, every grid image is marked `fetchPriority="low"`, which tells the browser to deprioritize them behind basically everything else on the page, making the wait even worse.

## The fix (frontend only, no DB changes)

**File:** `src/components/photos/components/PhotoCard.tsx`

1. Change the grid `<img src>` from `photo.url` to `getThumbnailUrl(photo.url, 512)` so each tile downloads a ~30–80 KB resized image instead of a multi-MB original.
2. Remove `fetchPriority="low"` so the browser fetches visible thumbnails at normal priority.
3. Leave the full-size `photo.url` in `PhotoViewer` / share / download flows untouched — those should stay full quality.

Everything else (lazy-loading via IntersectionObserver, infinite scroll, HEIC handling, selection, context menus) stays exactly the same.

## Expected result

The grid should go from "minutes for a few rows" to filling the visible viewport in roughly a second, with the remaining rows streaming in as you scroll.
