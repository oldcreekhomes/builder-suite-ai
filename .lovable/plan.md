
## Replace Pencil Icon with Three Dots in ProjectDashboard Header

### What Changes
In `src/pages/ProjectDashboard.tsx`, the pencil icon next to the project address in the page header is replaced with the three-dots (`MoreHorizontal`) icon — matching what was already done in `DashboardHeader.tsx`.

### File to Edit

**`src/pages/ProjectDashboard.tsx`**

1. **Line 11** — Change `Pencil` to `MoreHorizontal` in the lucide-react import
2. **In the JSX** — Replace `<Pencil className="h-4 w-4" />` with `<MoreHorizontal className="h-4 w-4" />`

The button behavior (opens the Edit Project dialog) stays exactly the same. No other files need to change.
