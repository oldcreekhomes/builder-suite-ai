## Confirm PO Dialog Polish

File: `src/components/bidding/ConfirmPODialog.tsx`

### 1. Add "Actions" header
The last `<TableHead className="w-[50px]"></TableHead>` (line 283) is empty above the trash can. Change to:
```tsx
<TableHead className="w-[50px]">Actions</TableHead>
```

### 2. Center the Proposal cell (PDF icon under "Proposal" header)
Line 332 — change `<TableCell className="p-1">` to `<TableCell className="p-1 text-center">` for the Proposal column body cell so the file icon centers under its header.

### 3. Center the Extra checkbox under the "Extra" header
Line 369 — change `<TableCell className="p-1">` to `<TableCell className="p-1 text-center">` for the Extra column body cell.

### 4. Red trash icon (matching app standard)
Line 384 — change `text-muted-foreground` to `text-red-600` to match the red `X`/delete color used elsewhere (e.g., `ProjectBidsDialog.tsx` uses `text-red-600`).
```tsx
<Trash2 className="h-3.5 w-3.5 text-red-600" />
```

### Notes
- Headers remain left-aligned per prior request; only the Proposal icon and Extra checkbox body cells are centered (so they sit under the visual midpoint of their narrow columns).
- No other table behavior, widths, or logic changes.
