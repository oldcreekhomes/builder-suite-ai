
Goal
- Make Photos page thumbnails look “full” while still honoring your requirement: Fit (no crop) + keep square cards + do not interfere with the checkbox (top-left) or the 3-dots menu (top-right).

What’s actually happening (why it still looks wrong)
- With “Fit (no crop)” inside a square card, very tall/portrait images will mathematically become a thin strip when scaled to fit entirely within the square. That is correct behavior for object-contain, but it looks like the image isn’t loading “full”.
- The Project Dashboard “looks full” because it uses object-cover (crop). So copying that code exactly would reintroduce cropping.

Better solution that matches your request (Fit + looks full)
- Use a “cover-blur background + contain foreground” thumbnail:
  - Background layer: same image, fills the square using object-cover, blurred/dimmed.
  - Foreground layer: same image, shows 100% using object-contain.
  - Result: you still see the entire photo (no crop), but the card visually feels filled, not like a thin strip on a blank background.

Implementation approach (no backend changes)
1) Update PhotoCard thumbnail rendering (non-HEIC branch only)
   - File: src/components/photos/components/PhotoCard.tsx
   - In the non-HEIC image block, replace the current single <img> with a layered structure:
     - Wrapper: div.w-full.h-full.relative.overflow-hidden.bg-gray-100.cursor-pointer
     - Background image (decorative):
       - <img> with:
         - className: "absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60"
         - aria-hidden="true"
         - draggable={false}
         - style/pointer events: add "pointer-events-none" to guarantee it cannot intercept clicks
     - Foreground image (real thumbnail):
       - <img> with:
         - className: "relative z-0 w-full h-full object-contain"
         - keep existing fade-in logic (opacity transition based on isImageLoaded)
         - keep loading/decoding/sizes/onLoad/onError as today
   - Ensure the existing absolute checkbox/menu remain above:
     - Keep checkbox container: className includes z-10 (already present)
     - Ensure the 3-dots container stays clickable:
       - If needed, bump it to z-20 (safe and explicit)

2) Confirm click targets are not affected
   - Keep onClick handler on the wrapper thumbnail div (as it is now).
   - Add pointer-events-none to both background image and the loading Skeleton overlay (if the skeleton overlay is currently blocking clicks after load, we’ll ensure it’s removed once loaded; if it’s absolute and persists, we’ll set pointer-events-none on it too).

3) Visual/UX acceptance checks
   - Portrait images:
     - Foreground shows the entire photo (no crop).
     - Card still feels “full” because blurred background fills the empty side areas.
   - Landscape images:
     - Same behavior (blur fills top/bottom bars).
   - Checkbox (top-left):
     - Clicking it toggles selection reliably.
     - It remains visible and not covered by the image.
   - 3-dots menu (top-right):
     - Opens reliably; menu items clickable.
   - Photo open:
     - Clicking the image area opens the viewer as before.

Files to change (only)
- src/components/photos/components/PhotoCard.tsx

Notes / why this is the closest match to “copy dashboard code”
- The dashboard’s “full-looking” effect comes from object-cover (cropping).
- This layered approach preserves your “Fit (no crop)” requirement while achieving the “full card” look you’re expecting from the dashboard.

Risks & mitigations
- Slight extra bandwidth: loads the same thumbnail twice (background + foreground).
  - Mitigation: both use the same transformed thumbnail URL (512) and lazy loading; still lightweight compared to full originals.
- If performance becomes a concern later, we can generate a smaller background (e.g., width=128) while keeping foreground at 512.

Test steps after implementation
1) Open /project/:id/photos
2) Verify multiple portrait photos no longer look “cut off” or “tiny on blank”
3) Verify checkbox toggles without opening viewer
4) Verify 3-dots menu works and Delete confirmation still appears
