
## Change Edit Button to Three Dots in Project Header

### What Changes
In `src/components/DashboardHeader.tsx`, the pencil icon (`<Pencil className="h-3 w-3" />`) next to the project address is replaced with a three-dots icon (`<MoreHorizontal className="h-4 w-4" />`). The button behavior (opens the Edit Project dialog) stays exactly the same.

### File to Edit

**`src/components/DashboardHeader.tsx`**

1. Remove `Pencil` from the import, add `MoreHorizontal`
2. Replace `<Pencil className="h-3 w-3" />` with `<MoreHorizontal className="h-4 w-4" />`

That's it — no other files need to change.
