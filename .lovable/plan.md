
# Plan: Fix Photo Thumbnails to Show 100% of Image

## Problem
The thumbnails on the Photos page are showing the images incorrectly - they appear small and positioned to one side rather than being scaled to fill the container while maintaining aspect ratio. From your screenshot, the images look like they're rendering at their natural size and positioned incorrectly, rather than being scaled to fit within the square container.

## Root Cause
The `object-contain` CSS property requires the image to have proper dimensions from its parent container. While the current code has `w-full h-full`, the image needs to be in a flex container with centering to ensure proper positioning and scaling within the `aspect-square` container.

## Solution
Wrap the image in a flex container that:
1. Takes up the full width and height of the aspect-square container
2. Centers the image both horizontally and vertically
3. Has the gray background (moved from image to container)
4. Allows the image with `object-contain` to scale properly

## Technical Changes

### File: `src/components/photos/components/PhotoCard.tsx`

**Current structure (lines 122-137):**
```tsx
<img
  src={getThumbnailUrl(photo.url, 512)}
  alt={getPhotoDisplayName(photo)}
  className={`w-full h-full object-contain bg-gray-100 cursor-pointer ...`}
  ...
/>
```

**New structure:**
```tsx
<div className="w-full h-full flex items-center justify-center bg-gray-100">
  <img
    src={getThumbnailUrl(photo.url, 512)}
    alt={getPhotoDisplayName(photo)}
    className={`max-w-full max-h-full object-contain cursor-pointer ...`}
    ...
  />
</div>
```

### Key Differences:
1. **Flex wrapper** - Centers the image in both directions
2. **Background moved to wrapper** - The gray background is on the container, not the image
3. **`max-w-full max-h-full` instead of `w-full h-full`** - This allows the image to scale down while respecting its aspect ratio and the container boundaries
4. **`object-contain`** - Ensures the full image is visible without distortion

## Visual Result
- Portrait photos will be vertically centered with gray bars on left/right
- Landscape photos will be horizontally centered with gray bars on top/bottom  
- Square photos will fill the container completely
- All photos will show 100% of the image content

## File to Modify
- `src/components/photos/components/PhotoCard.tsx`
