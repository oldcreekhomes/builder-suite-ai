# Drawings viewer: full screen + mouse-wheel zoom

## What changes
1. **Full screen:** clicking a sheet opens it across the whole screen. The sheet title stays at the top, version history sits on the right, and the X closes it.
2. **Zoom with the mouse wheel:**
   - Scroll up to zoom in, centered where your mouse pointer is.
   - Scroll down to zoom back out. It stops at the starting size, with the whole sheet fitting the screen, and won't go smaller.
   - Once you're zoomed in, click and drag to move around the sheet.
   - Double-click to jump back to the starting size.
   - A small "Fit" button and a zoom % show in the corner.
   - Switching to another version goes back to the starting size.

## Technical details
- `ProjectDrawings.tsx` sheet viewer: `DialogContent` becomes `max-w-none w-screen h-screen` (no rounded corners) with a flex layout. The image area is `overflow-hidden` and fills the space left over.
- A local `ZoomableImage` handles the zoom: `scale` (min 1, max 8) plus x/y offset, applied with a CSS transform. A non-passive `wheel` listener (preventDefault) zooms toward the pointer, panning uses pointer drag, and the view resets when the image src changes.
