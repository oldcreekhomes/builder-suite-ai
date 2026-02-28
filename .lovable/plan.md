

## Remove Empty Gray Header Bar from Project Pages

### Problem
The project-specific header still renders a gray bar with a border (`border-b`) above page content like "Photos", "Files", etc. It serves no purpose now that the project address has been removed -- it's just wasted vertical space.

### Changes

**File: `src/components/DashboardHeader.tsx`**

Replace the project-specific header block (lines 49-62) to return `null` when `projectId` is set. The sidebar expand button needs to be preserved for when the sidebar is collapsed, so we'll render just that button without any header bar/border:

- When sidebar is expanded: render nothing (`null`) -- no header at all
- When sidebar is collapsed: render only the small expand button with no background bar or border, positioned inline with the page content

Alternatively, the simplest approach: return `null` for the project header entirely, and move the sidebar collapse toggle into the page content area. However, since every project page already has its own content section with padding, the cleanest solution is to render the expand button only when collapsed, without the `<header>` wrapper, border, or background -- just a floating button at the top.

**Concrete change:**
```tsx
// Replace the project header block with:
if (projectId) {
  if (!isCollapsed) return null;
  return (
    <div className="px-6 pt-2">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

This removes the gray bar and border entirely. The sidebar expand button still appears when needed but without the visual header strip. Page titles like "Photos" and "Files" will now sit at the very top of the content area.

