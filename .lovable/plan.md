
Goal (what you asked for)
- Make the Project Photos page thumbnails look exactly like the Project Dashboard “Project Photos” card thumbnails: sharp, fully filling each square tile.

What I found (why it’s “still wrong” even with object-cover)
- Your dashboard card uses the ORIGINAL image URL directly:
  - In `src/pages/ProjectDashboard.tsx` it renders: `src={photo.url}` with `className="w-full h-full object-cover"`.
- Your Photos page grid uses a TRANSFORMED thumbnail URL:
  - In `src/components/photos/components/PhotoCard.tsx` it renders: `src={getThumbnailUrl(photo.url, 512)}`
  - `getThumbnailUrl()` converts Supabase public URLs into a `/render/image/... ?width=512&quality=80` transformation.
- On the Photos page, the tiles are often larger than 512px (especially on desktop and high-DPI screens). So the browser stretches a 512px image to fill a bigger square → it looks soft/blurry and “not 100%”.
- This is why “copy the dashboard code” hasn’t actually happened yet: the Photos page is still using the 512px transformed URL, while the dashboard is using the full-size URL.

Root cause (in one sentence)
- The Photos page is rendering low-resolution 512px transformed thumbnails, while the dashboard renders the original full-resolution images; the CSS is already correct.

Implementation approach (copy dashboard behavior)
1) Update the Photos grid thumbnail to use the same `src` as the dashboard
   - File: `src/components/photos/components/PhotoCard.tsx`
   - Change ONLY the non-HEIC thumbnail `<img>` to use:
     - `src={photo.url}`
   - Keep:
     - `className="w-full h-full object-cover ..."`
     - `loading="lazy"`, `decoding="async"`, `sizes=...` and fade-in logic
   - Result: thumbnails will be as sharp as the dashboard because they come from the same image URL.

2) Optional (but recommended) performance guardrail
   - Using full-size URLs everywhere can increase bandwidth.
   - If needed after you confirm visuals, we’ll implement “dashboard look + optimized size” by switching to a larger transform (e.g., 1200–1600px instead of 512) or using `srcSet` based on device pixel ratio.
   - For now, per your instruction, we will match the dashboard exactly first.

3) Verify the layout matches the dashboard tiles
   - The dashboard tiles are: `aspect-square` container + `img w-full h-full object-cover`.
   - Your PhotoCard already uses: `div.relative.aspect-square` + `img w-full h-full object-cover`.
   - So after switching the `src` to `photo.url`, the Photos page tiles should match the dashboard behavior.

Acceptance checklist (what you should see after the change)
- On `/project/:id/photos`:
  - Thumbnails are sharp (not blurry).
  - Each tile is fully filled (no letterboxing).
  - Cropping behavior matches the dashboard (object-cover crops edges as needed).
  - Checkbox and 3-dot menu still work (no click interference).

Technical notes (for completeness)
- File to change: `src/components/photos/components/PhotoCard.tsx`
- Current: `src={getThumbnailUrl(photo.url, 512)}`
- Planned: `src={photo.url}` (same as dashboard)
- No backend changes.

Why I’m not trying more CSS changes
- The current CSS (`w-full h-full object-cover`) is already the “full tile” behavior you want.
- The difference you’re seeing is image resolution (512px transform vs original), not layout.

After you approve this plan in Default mode, I’ll implement it and then we can decide if you want the optimized high-res transforms (same look, less bandwidth) as a second step.
