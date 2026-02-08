

# Fix Marketplace Signup Page - Scroll to Top on Load

## Problem Identified
The `/auth/marketplace` page has proper layout with:
- BuilderSuite header with logo
- Centered title "Join the BuilderSuite Marketplace"
- Centered form card

However, when users navigate from a scrolled position on feature pages (like clicking "Join Free"), the browser maintains the scroll position, cutting off the header and title.

## Solution
Add a `useEffect` hook to scroll to the top of the page when the `MarketplaceSignup` component mounts. This ensures users always see the full page from the top.

## File to Change

### `src/pages/MarketplaceSignup.tsx`

Add scroll-to-top behavior in a `useEffect`:

```tsx
import { useState, useEffect } from "react";
// ... existing imports

const MarketplaceSignup = () => {
  // ... existing state

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ... rest of component
};
```

## Technical Details

The fix adds a single `useEffect` with an empty dependency array that runs once when the component mounts. This calls `window.scrollTo(0, 0)` to reset the scroll position to the top of the page.

This is a minimal, targeted fix that:
1. Ensures the page always loads showing the BuilderSuite header and title
2. Does not affect other navigation behavior
3. Follows React best practices for side effects

