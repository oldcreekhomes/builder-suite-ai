

## Rearrange Edit Project Dialog Layout

### Current Layout
1. Address (full width)
2. Construction Manager | Accounting Manager
3. Status | Region
4. Accounting Software (half width, alone)

### New Layout
1. Address (3/4 width) | Region (1/4 width, no helper text)
2. Construction Manager | Accounting Manager
3. Status | Accounting Software

### Changes (single file: `src/components/EditProjectDialog.tsx`)

- **Row 1**: Change the Address block from full-width to a `grid grid-cols-4 gap-4` row. Address gets `col-span-3`, Region gets `col-span-1`. Remove the helper text paragraph ("Used to filter companies by service area...") from the Region field.
- **Row 3**: Move Accounting Software into the existing Status row (right side), replacing the current Region position. Remove the standalone Accounting Software row below.

