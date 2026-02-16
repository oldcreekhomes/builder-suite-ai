

## Fix Table Headers Color and Row Height

### Problem
Two mismatches with the shadcn reference screenshot:
1. **Header text is gray** -- `text-muted-foreground` on TableHead produces medium gray headers. The shadcn example shows dark/near-black headers.
2. **Employee rows are too tall** -- The Avatar component defaults to `h-10 w-10` (40px), which bloats rows to ~3x the height of shadcn's compact rows.

### Changes

**1. `src/components/ui/table.tsx` -- Remove `text-muted-foreground` from TableHead**

Change the TableHead className from:
`h-10 px-2 text-left align-middle font-medium text-muted-foreground`

To:
`h-10 px-2 text-left align-middle font-medium text-foreground`

This makes headers dark/black, matching the shadcn screenshot exactly. The `font-medium` (500 weight) stays, which gives headers a slightly lighter weight than bold body text -- just like the screenshot.

**2. `src/components/employees/EmployeeTable.tsx` -- Shrink the Avatar**

Add `className="h-6 w-6"` to the Avatar and reduce the text wrapper, so the employee row height matches other rows:

```tsx
<Avatar className="h-6 w-6 text-xs">
```

This brings the avatar from 40px down to 24px, letting the row stay compact like the shadcn example.

### Files Modified
1. `src/components/ui/table.tsx` -- 1 class change (header color)
2. `src/components/employees/EmployeeTable.tsx` -- 1 class addition (avatar size)

### Impact
- Header color change cascades to ALL tables app-wide (good -- consistent dark headers everywhere)
- Avatar shrink only affects the Employee table
- No logic or functionality changes
