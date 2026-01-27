
# Plan: Display Full Image Without Scrolling

## Problem
When viewing photos in the photo viewer, tall images are being cropped because the image is not properly constrained to fit within the visible container. The user wants to see the entire photo on page load without needing to scroll.

## Solution
Use CSS to ensure the image always scales down to fit within the available container space, showing the full image without cropping or scrolling. The image will be displayed at the largest possible size that still fits entirely within the viewer.

## Technical Approach

### Key Changes to `PhotoViewerImage.tsx`:

1. **Revert container to `overflow-hidden`** - No scrolling needed since the entire image will be visible
2. **Add `max-h-full` back to the image** - This constrains the image height to the container
3. **Remove the conditional `maxHeight` style** - The `max-h-full` class handles this consistently
4. **Keep `object-contain`** - This ensures the image scales proportionally without distortion

### How It Works
- The container uses `flex-1` to fill available vertical space within the dialog
- The image uses `max-w-full max-h-full object-contain` which tells the browser:
  - Never exceed the container's width
  - Never exceed the container's height
  - Scale proportionally (maintain aspect ratio)
  - Center the image within the container

### Result
- Tall portrait images will scale down to fit the available height
- Wide landscape images will scale down to fit the available width
- The entire image is always visible on page load
- No scrolling required
- Users can still zoom in and pan to see details

## Files to Modify
- `src/components/photos/PhotoViewerImage.tsx`

## Visual Behavior
When opening a tall photo like the one from 126 Longview:
- The full image (including the trees at the bottom) will be visible
- The image will be scaled down proportionally to fit within the viewer
- Users can zoom in using the zoom controls to see full-resolution details
- Pan mode becomes available when zoomed in to explore different areas
