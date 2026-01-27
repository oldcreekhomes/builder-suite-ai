
## What’s really happening (why 50% shows everything, but 100% crops)
Right now the photo viewer dialog uses `max-h-[95vh]` (a maximum height) but **does not set an explicit height**. Because of that, the flex layout inside the dialog doesn’t always get a reliable “available height” to size the image area (`flex-1`). On tall/portrait images, the `<img>` can end up effectively sizing itself larger than the visible area, and since the viewer container uses `overflow-hidden`, the bottom gets cut off.

At 50% zoom, you’re scaling the image down enough that it happens to fit, which is why you can see the full picture.

So the fix is not scrolling or changing the image itself — it’s making the dialog’s layout compute height correctly so that `max-h-full + object-contain` can do its job.

---

## Goal
At “100%” (zoom = 1), **the entire image should always fit inside the viewer** (no cropping), regardless of portrait vs landscape.

---

## Implementation approach (layout correctness)
### 1) Give the dialog a real height so flex can size the image region correctly
Update `src/components/photos/PhotoViewer.tsx`:
- Change `DialogContent` from using only `max-h-[95vh]` to also having an explicit height:
  - Add `h-[95vh]` (keep `max-h-[95vh]` if desired, but `h-[95vh]` is the key)
- Add `overflow-hidden` (already effectively handled by inner wrapper, but keeping it consistent is fine)

Example intent (not exact code):
- `className="max-w-5xl w-full h-[95vh] p-0 flex flex-col border-0"`

Why: With a defined height, the inner `flex flex-col` container can properly allocate remaining space to the image area.

### 2) Ensure the flex children can actually shrink inside the dialog
In `src/components/photos/PhotoViewer.tsx`, update the inner wrapper div:
- Add `min-h-0` to the main flex column wrapper, so the `flex-1` image area can size within the available height without overflowing.
  - Current: `className="relative w-full h-full flex flex-col ..."`
  - Change intent: `className="relative w-full h-full min-h-0 flex flex-col ..."`

Why: In CSS flexbox, `min-height: auto` can prevent children from shrinking and causes overflow/cropping. `min-h-0` is the standard fix.

### 3) Ensure the image container is also allowed to shrink
Update `src/components/photos/PhotoViewerImage.tsx` container div:
- Add `min-h-0` alongside `flex-1`:
  - Current: `className="flex-1 flex items-center ... overflow-hidden"`
  - Change intent: `className="flex-1 min-h-0 flex items-center ... overflow-hidden"`

Why: This makes sure the area that constrains the image is computed correctly.

### 4) Keep the “fit” behavior at zoom=1, and only rely on zoom transforms for >1 (optional hardening)
Today you always apply:
- `transform: scale(zoom) translate(...)`

Even though `scale(1)` is a no-op, explicitly applying transforms sometimes makes debugging sizing harder and can create subtle layout differences. As a robustness improvement:
- When `zoom === 1` and pan is disabled, render the image without transform (or set transform to `none`)
- When `zoom !== 1`, apply transform for zoom/pan

This step is optional if steps 1–3 fully resolve it, but it’s a good “belt-and-suspenders” improvement for predictability.

---

## Scope check: apply same fix to CompanyPhotoViewer (recommended)
You have another viewer: `src/components/CompanyPhotoViewer.tsx` that uses similar structure (`DialogContent` with `max-h-[95vh]` and an inner `h-full flex flex-col`).
To avoid the exact same portrait cropping problem there:
- Apply the same layout fixes:
  - `DialogContent` gets `h-[95vh]`
  - Add `min-h-0` to the main flex wrapper and to the image container area

---

## Files to change
1) `src/components/photos/PhotoViewer.tsx`
- Add explicit height to `DialogContent`
- Add `min-h-0` to the main wrapper flex container

2) `src/components/photos/PhotoViewerImage.tsx`
- Add `min-h-0` to the image container
- (Optional) Make transform conditional when `zoom === 1`

3) (Recommended) `src/components/CompanyPhotoViewer.tsx`
- Same height + `min-h-0` adjustments for consistent behavior across the app

---

## Testing checklist (what we’ll verify in preview)
- Open a portrait/vertical photo at 100%:
  - The entire image is visible (top to bottom), no cropping
- Open a landscape photo at 100%:
  - Entire image visible, no cropping
- Zoom to 125%, 150%:
  - Cropping is expected (because you’re zoomed in), and pan mode still works
- Navigate next/prev:
  - Layout remains stable and consistent between images of different aspect ratios

---

## Why this is the best “no scrolling” solution
- It keeps the “fit inside viewer” behavior at 100%
- It doesn’t distort the image (still `object-contain`)
- It’s consistent across screen sizes and aspect ratios
- It fixes the root cause (flex height calculation), instead of masking it with scrollbars
