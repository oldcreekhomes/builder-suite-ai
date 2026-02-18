
## Fix: Precisely Align Dashboard Header with Sidebar Branding

### Root Cause (Exact Calculation)

The sidebar branding (`SidebarHeader`) uses `py-2` (8px top/bottom padding). Inside it:
- The shadcn `SidebarHeader` base adds `flex flex-col gap-2 p-2`, but the custom className `px-6 py-2` overrides the padding
- Content: `text-xl` title (~28px line-height) + `mb-1` (4px gap) + `text-sm` subtitle (~20px) = 52px of content
- **Total sidebar header height: 8 + 52 + 8 = ~68px**

The current `DashboardHeader` with `py-4` (16px top/bottom):
- Content: `text-2xl` (~32px line-height) = 32px of content
- **Total header height: 16 + 32 + 16 = 64px**

The 4px gap is why they still don't align. Adjusting `py-4` alone is imprecise because font rendering varies. The reliable fix is to set an **explicit minimum height** using `style={{ minHeight: '68px' }}` on the header element, combined with `flex items-center` to vertically center the content — this guarantees the header bottom border lands exactly where the sidebar branding bottom border is.

### The Fix

**`src/components/DashboardHeader.tsx` — line 103**

Change from:
```tsx
<header className="bg-gray-50 border-b border-border px-6 py-4">
  <div className="flex items-center justify-between">
```

To:
```tsx
<header className="bg-gray-50 border-b border-border px-6" style={{ minHeight: '68px' }}>
  <div className="flex items-center justify-between h-full" style={{ minHeight: '68px' }}>
```

Actually, the simplest and most pixel-perfect approach: remove `py-4` and replace with an explicit `h-[68px]` Tailwind class and `flex items-center` on the header itself:

```tsx
<header className="bg-gray-50 border-b border-border px-6 h-[68px] flex items-center">
  <div className="flex items-center justify-between w-full">
```

This sets the header to exactly 68px — the same computed height as the sidebar branding block — and the bottom borders will be perfectly level.

### Why This Works

- `h-[68px]` sets a fixed height, eliminating any font-rendering variance from `py-` padding alone
- `flex items-center` on the header vertically centers the content row within those 68px
- `w-full` on the inner div ensures the `justify-between` layout still spans the full width

### Files Changed

- **`src/components/DashboardHeader.tsx`** — line 103 only: replace `py-4` with `h-[68px] flex items-center`, and adjust inner div to `w-full`
