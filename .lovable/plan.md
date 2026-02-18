
## Fix Settings Page Header Alignment & Gray Line

### What the User Sees

From the screenshot:
1. **Gray line at the very top** — Between the sidebar's "Construction Management" border and the main header bar, there is a visible gap caused by `mt-4` on the `<header>` element in `DashboardHeader.tsx`. This gap exposes the `bg-gray-50` page background as a thin gray strip.
2. **Right side content is lower than the left sidebar border** — The header (with "Old Creek Homes, LLC" and the "New Project" button) is pushed down by that `mt-4`, while the sidebar border sits flush at the top.
3. **Header background is white** — User wants the top bar to be gray (matching the page background), not bright white.

### Root Cause

In `src/components/DashboardHeader.tsx` (line 103), the default header has:
```tsx
<header className="bg-white border-b border-border px-6 py-2 mt-4">
```

- `mt-4` creates a 16px gap above the header → this is the "gray line" (the `bg-gray-50` showing through)
- `bg-white` makes the header bright white instead of the gray background the user wants

### Changes — `src/components/DashboardHeader.tsx`

**Line 103** — Remove `mt-4`, change `bg-white` to `bg-gray-50`:

```tsx
// Before
<header className="bg-white border-b border-border px-6 py-2 mt-4">

// After
<header className="bg-gray-50 border-b border-border px-6 py-2">
```

This:
- Removes the gap so the right-side header aligns vertically with the sidebar's "Construction Management" border
- Changes the top bar background from white to gray, making it seamless with the page background and matching the user's request

### No Other Files Need to Change

The Settings page layout (`src/pages/Settings.tsx`) and the AppSidebar are unaffected — the fix is entirely in the header `className`.

### Visual Result

| Element | Before | After |
|---|---|---|
| Top gap (gray line) | 16px (`mt-4`) | None (removed) |
| Header background | `bg-white` | `bg-gray-50` |
| Vertical alignment | Misaligned (header lower) | Flush with sidebar border |
