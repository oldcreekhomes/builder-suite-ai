

## Fix Table Sizing to Match Current shadcn/ui Defaults

### Problem
The previous update used outdated shadcn values (`h-12 px-4` for headers, `p-4` for cells), making rows ~3x taller than they should be. The current shadcn/ui source uses more compact values.

### Fix

**Single file change: `src/components/ui/table.tsx`**

- **TableHead**: Change `h-12 px-4` back to `h-10 px-2`
- **TableCell**: Change `p-4` back to `p-2`

Everything else stays the same (no sticky header, no shadow, `text-muted-foreground` on headers, `font-medium`). These two changes will cascade to all tables automatically.

### Note on Header Color
The shadcn default headers use `text-muted-foreground` (medium gray), which is what we have. Looking closely at the shadcn screenshot, the headers ("Invoice", "Status", etc.) are gray too -- the body text ("INV001", "Paid") is the darker color. This matches our current setup. If after seeing the compact sizing you still want darker headers, we can adjust separately.

### Technical Details
- **Files changed**: 1 (`src/components/ui/table.tsx`)
- **Lines changed**: 2 class strings
- **Risk**: None -- this restores the correct compact spacing

