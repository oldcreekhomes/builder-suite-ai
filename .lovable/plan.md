

# Plan: Fix Photo Thumbnails to Show Full Image in Square Cards

## Problem
The thumbnails on the Photos page are displaying very small and not filling the square container. From your screenshot, the images appear tiny and positioned to one side rather than scaling to fill the available space while maintaining aspect ratio.

## Root Cause
The current CSS approach uses `max-w-full max-h-full` on the `<img>` element, which only constrains the maximum size but doesn't force the image to scale up to fill the container. Combined with the flex centering, small images remain at their natural size.

## Solution
Change the image styling to use `w-full h-full object-contain`. This combination will:
1. Make the image take up the full width and height of its container
2. Use `object-contain` to scale the image proportionally without cropping
3. Center the image automatically (object-contain centers by default)

Since you want "Fit (no crop)" with "Keep square cards", this approach shows the entire photo centered within the square, with gray background filling any empty space.

## Technical Changes

### File: `src/components/photos/components/PhotoCard.tsx`

**Current code (lines 123-140):**
```tsx
<div 
    className="w-full h-full flex items-center justify-center bg-gray-100 cursor-pointer"
    onClick={() => onPhotoSelect(photo)}
  >
    <img
      src={getThumbnailUrl(photo.url, 512)}
      alt={getPhotoDisplayName(photo)}
      className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
        isImageLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      ...
    />
  </div>
```

**Updated code:**
```tsx
<div 
    className="w-full h-full bg-gray-100 cursor-pointer"
    onClick={() => onPhotoSelect(photo)}
  >
    <img
      src={getThumbnailUrl(photo.url, 512)}
      alt={getPhotoDisplayName(photo)}
      className={`w-full h-full object-contain transition-opacity duration-300 ${
        isImageLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      ...
    />
  </div>
```

### Key Changes:
1. **Remove flex centering from wrapper** - Not needed because `object-contain` handles centering automatically
2. **Change `max-w-full max-h-full` to `w-full h-full`** - Forces the image element to fill the container
3. **Keep `object-contain`** - Scales the image proportionally to fit within the container without cropping, centering it automatically

## Visual Result
- The image element will fill the entire square container
- `object-contain` will scale the photo to fit, maintaining aspect ratio
- Portrait photos will have gray bars on left/right
- Landscape photos will have gray bars on top/bottom
- The checkbox (top-left) and three-dots menu (top-right) remain unaffected as they are absolutely positioned with z-index

## File to Modify
- `src/components/photos/components/PhotoCard.tsx` (lines 123-140)

