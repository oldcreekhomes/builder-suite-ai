

# Center the Marketplace Signup Page Layout

## Problem Identified
The `/auth/marketplace` page content appears left-aligned because:
1. The header background spans full width, but the inner content is constrained to `max-w-2xl` (672px)
2. On wide screens, this narrow centered content looks left-aligned relative to the full viewport
3. The visual imbalance makes the page look skewed to the left

## Solution
Expand the header's max-width to match standard page layouts (`max-w-7xl` like the PublicHeader uses), ensuring the BuilderSuite logo and "Back to Home" button span appropriately across the viewport. The main content area will remain centered with proper padding.

## File to Change

### `src/pages/MarketplaceSignup.tsx`

**Header Changes (Line 206):**
- Change `max-w-2xl` to `max-w-7xl` for the header container
- This matches the PublicHeader component's layout and ensures the header content spans properly

**Current:**
```tsx
<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
```

**New:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

**Main Content Changes (Line 223):**
- Add `flex-1 flex flex-col items-center` to ensure vertical centering and horizontal alignment
- Keep the Card at `max-w-2xl` but ensure it's centered within the flex container

**Current:**
```tsx
<main className="max-w-2xl mx-auto px-4 py-12">
```

**New:**
```tsx
<main className="flex-1 w-full max-w-2xl mx-auto px-4 py-12">
```

## Visual Result
- Header: BuilderSuite logo on left, "Back to Home" on right, spanning the full width like the public header
- Main content: Title, description, and form card centered in the viewport
- Consistent appearance with other pages in the application

