# Show whole photos in thumbnails

## What's happening
Thumbnails are already shrunk (compressed) before loading. They show only part of the picture because each square box is set to fill and crop the photo.

## Changes
1. **Thumbnails show the whole photo.** Each square box fits the entire picture inside it, with a light gray background around photos that are wider or taller than the square. They stay compressed, so loading speed stays the same.
   - Project Dashboard → Project Photos card
   - Photos page grid
   - Company Dashboard Recent Photos and Company photo grid
2. **Clicking a photo opens the original, full-size, uncompressed file.** The viewer already does this; no change needed.
3. Thumbnails ask for a compressed version that keeps the photo's shape, never cropped.

## Technical details
- Swap `object-cover` to `object-contain` on the `<img>` in `ProjectDashboard.tsx`, `PhotoCard.tsx`, `RecentPhotos.tsx`, `CompanyPhotoGrid.tsx`; containers keep `bg-muted`.
- `getThumbnailUrl` in `src/utils/thumbnailUtils.ts` adds `&resize=contain` so the storage transform never crops.
- `PhotoViewerImage.tsx` keeps using `photo.url` (original).
