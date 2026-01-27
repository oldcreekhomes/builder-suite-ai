

# Plan: Fix Photo Thumbnails - Use Same Code as Dashboard

## Problem
The current implementation uses a complex blur-background approach that makes all photos look blurry. You want the Photos page thumbnails to look exactly like they do on the Project Dashboard - clean, clear, and filling the square cards.

## Solution
Replace the complicated layered blur approach with the exact same simple code the dashboard uses:

```tsx
<img
  src={getThumbnailUrl(photo.url, 512)}
  className="w-full h-full object-cover"
/>
```

This uses `object-cover` which:
- Fills the entire square card with the image
- Crops edges as needed to maintain aspect ratio
- Shows a clear, sharp image (no blur)

## Technical Changes

### File: `src/components/photos/components/PhotoCard.tsx`

Remove the blur background layer and simplify the image rendering to match the dashboard exactly.

**Current code (lines 122-147) - the complex blur approach:**
```tsx
<div 
  className="w-full h-full relative overflow-hidden bg-gray-100 cursor-pointer"
  onClick={() => onPhotoSelect(photo)}
>
  {/* Background blur fill layer */}
  <img
    src={getThumbnailUrl(photo.url, 512)}
    alt=""
    aria-hidden="true"
    draggable={false}
    className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60 pointer-events-none"
  />
  {/* Foreground image (full, no crop) */}
  <img
    src={getThumbnailUrl(photo.url, 512)}
    alt={getPhotoDisplayName(photo)}
    className={`relative z-0 w-full h-full object-contain transition-opacity duration-300 ${...}`}
    ...
  />
</div>
```

**New code - simple like dashboard:**
```tsx
<div 
  className="w-full h-full bg-gray-100 cursor-pointer"
  onClick={() => onPhotoSelect(photo)}
>
  <img
    src={getThumbnailUrl(photo.url, 512)}
    alt={getPhotoDisplayName(photo)}
    className={`w-full h-full object-cover transition-opacity duration-300 ${
      isImageLoaded ? 'opacity-100' : 'opacity-0'
    }`}
    loading="lazy"
    decoding="async"
    fetchPriority="low"
    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
    onLoad={() => setIsImageLoaded(true)}
    onError={() => setIsImageLoaded(true)}
  />
</div>
```

## Key Changes
1. **Remove blur background layer** - No more decorative blurred image
2. **Change `object-contain` to `object-cover`** - Matches dashboard behavior
3. **Remove unnecessary classes** - No `relative`, `overflow-hidden`, or `z-0` needed
4. **Keep lazy loading and fade-in** - Preserve performance optimizations

## Visual Result
- Photos will fill the entire square card (like the dashboard)
- Images will be sharp and clear (no blur)
- Some cropping may occur for non-square photos (this is how the dashboard works)
- Checkbox and menu remain unaffected

## File to Modify
- `src/components/photos/components/PhotoCard.tsx`

