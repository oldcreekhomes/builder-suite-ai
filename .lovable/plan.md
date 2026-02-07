

## Remove Hero "Get Started" Button and Tighten Layout

### Problem
The current landing page has a "Get Started" button in the hero section that conflicts with the "Who Are You?" two-path section directly below it. This creates confusion because:
1. The hero button goes directly to `/auth?tab=signup` (builder signup only)
2. The section below properly differentiates between builders and marketplace vendors

### Solution
Remove the "Get Started" button from the hero section and reduce the spacing to create a tighter, more cohesive flow from the hero messaging directly into the "Who Are You?" path selection.

### File to Modify

**`src/pages/Landing.tsx`**

### Changes

1. **Remove the "Get Started" button block** (lines 185-192)
   - Delete the entire `<div className="flex flex-col sm:flex-row gap-4 justify-center">` block containing the button

2. **Reduce hero section bottom padding** (line 173)
   - Change `py-20` to `py-16 pb-8` so the hero flows more naturally into the path selection

3. **Reduce "Who Are You?" section top padding** (line 198)
   - Change `py-20` to `pt-8 pb-20` to close the gap between the hero and path selection

### Visual Result

```text
BEFORE:
+---------------------------+
|  Hero Title               |
|  Subtitle                 |
|                           |
|  [Get Started Button]     |  <-- REMOVE THIS
|                           |
|                           |  <-- Large gap
|                           |
|  Who Are You?             |
|  [Builder] [Subcontractor]|
+---------------------------+

AFTER:
+---------------------------+
|  Hero Title               |
|  Subtitle                 |
|                           |  <-- Tighter spacing
|  Who Are You?             |
|  [Builder] [Subcontractor]|
+---------------------------+
```

This creates a single, clear call-to-action flow where visitors immediately see their two options after reading the hero message.

