
# Plan: Show Full Thumbnails on Photos Page

## Problem
On the Photos page, the thumbnails are using `object-cover` which crops portrait and landscape images to fill a square container. This results in about 50% of the image being cut off, especially for vertical/portrait photos.

The Project Dashboard also uses `object-cover`, but the thumbnails there are smaller and the cropping is less noticeable.

## Solution
Change the PhotoCard thumbnails to use `object-contain` instead of `object-cover`. This will scale the entire image to fit within the square container without cropping, showing 100% of the photo.

## Technical Changes

### File: `src/components/photos/components/PhotoCard.tsx`

**Line 126 - Change image CSS class:**
- **From:** `object-cover`
- **To:** `object-contain bg-gray-100`

The `object-contain` property ensures the entire image is visible by scaling it proportionally to fit within the container. The `bg-gray-100` provides a subtle gray background for the "letterbox" areas around non-square photos.

## Visual Result
- **Portrait photos:** Will have gray bars on the left and right sides
- **Landscape photos:** Will have gray bars on top and bottom
- **Square photos:** Will fill the container perfectly (no change)
- **All photos:** Show 100% of the image content without cropping

## File to Modify
- `src/components/photos/components/PhotoCard.tsx` (single line change)
