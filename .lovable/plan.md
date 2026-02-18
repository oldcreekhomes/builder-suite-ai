
## Align Dashboard Header Height with Sidebar Branding

### The Problem

The sidebar branding block (`SidebarBranding`) displays two lines of text:
- Line 1: **BuilderSuite ML** (`text-xl font-bold`) + 4px margin-bottom
- Line 2: **Construction Management** (`text-sm text-gray-600`)

With `py-2` (8px top + 8px bottom), the total sidebar branding height is approximately:
- 8px (padding-top) + 28px (title) + 4px (mb-1) + 20px (subtitle) + 8px (padding-bottom) ≈ **68px**

The dashboard header currently has `py-2` with only one line of text (`text-2xl font-bold`):
- 8px + 32px + 8px ≈ **48px**

This 20px difference is why the right-side content appears lower — the header bar is shorter than the sidebar branding block.

### Fix — `src/components/DashboardHeader.tsx`

Change the default header padding from `py-2` to `py-4` to expand the header height to match the sidebar's two-line branding block:

```tsx
// Before (line 103)
<header className="bg-gray-50 border-b border-border px-6 py-2">

// After
<header className="bg-gray-50 border-b border-border px-6 py-4">
```

**Why `py-4`?**
- `py-4` = 16px top + 16px bottom = 32px total padding
- Header total: 16 + 32 + 16 = **64px** — closely matching the sidebar branding block (~68px)
- This brings the bottom border of the header into alignment with the bottom border of the sidebar branding section

### Only One Line Changes

- **File:** `src/components/DashboardHeader.tsx`, line 103
- **Change:** `py-2` → `py-4` on the default header element

The sidebar, ProjectSelector, and all other files remain untouched.
