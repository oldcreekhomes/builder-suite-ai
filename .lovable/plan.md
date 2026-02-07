
# Update Edit Company Representatives Tab to Match Representatives Table

## Overview
Update the `RepresentativeContent` component in `src/components/companies/RepresentativeSelector.tsx` to match the styling and column structure of the main Representatives table.

## Current State
The Edit Company dialog's Representatives tab currently shows:
- **Name** (first + last combined)
- **Title** 
- **Email**
- **Phone**

It lacks edit/delete actions and uses muted text colors for some fields.

## Desired State
Match the Representatives tab with these columns:
- **First Name** (separate column)
- **Last Name** (separate column)
- **Type** (with colored badges, matching Representatives tab styling)
- **Email** (plain text, same color as names)
- **Phone** (plain text, same color as names)
- **Actions** (centered Edit and Delete buttons)

## File to Modify

### `src/components/companies/RepresentativeSelector.tsx`

#### Change 1: Add Required Imports
Add these imports at the top:
- `useMutation`, `useQueryClient` from `@tanstack/react-query`
- `Button` from `@/components/ui/button`
- `DeleteButton` from `@/components/ui/delete-button`
- `Edit` from `lucide-react`
- `Badge` from `@/components/ui/badge`
- `useToast` hook
- Add an `EditRepresentativeDialog` import for editing functionality

#### Change 2: Add Type Color Helper Function
Add the same `getTypeColor` function used in RepresentativesTable:
```tsx
const getTypeColor = (type: string) => {
  switch (type) {
    case 'owner': return 'bg-purple-100 text-purple-800';
    case 'project_manager': return 'bg-blue-100 text-blue-800';
    case 'superintendent': return 'bg-green-100 text-green-800';
    case 'foreman': return 'bg-yellow-100 text-yellow-800';
    case 'estimator': return 'bg-orange-100 text-orange-800';
    case 'accounting': return 'bg-pink-100 text-pink-800';
    case 'sales': return 'bg-cyan-100 text-cyan-800';
    case 'operations': return 'bg-indigo-100 text-indigo-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
```

#### Change 3: Add Representative Types Array
```tsx
const representativeTypes = [
  { value: 'owner', label: 'Owner' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'superintendent', label: 'Superintendent' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
];
```

#### Change 4: Update RepresentativeContent Component
Replace the grid layout and content:

**Header row** - Change from 4 columns to 6 columns:
```tsx
<div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
  <span>First Name</span>
  <span>Last Name</span>
  <span>Type</span>
  <span>Email</span>
  <span>Phone</span>
  <span className="text-center w-16">Actions</span>
</div>
```

**Data rows** - Update to match Representatives tab styling:
```tsx
<div 
  key={representative.id} 
  className="grid grid-cols-[1fr_1fr_1fr_1.5fr_1fr_auto] gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 items-center"
>
  <span className="truncate text-xs">
    {representative.first_name}
  </span>
  <span className="truncate text-xs">
    {representative.last_name}
  </span>
  <span className="truncate text-xs">
    {representative.title ? (
      <Badge className={`${getTypeColor(representative.title)} text-[10px] px-1 py-0 border-0`}>
        {representativeTypes.find(t => t.value === representative.title)?.label || toTitleCase(representative.title)}
      </Badge>
    ) : (
      <span className="text-gray-400">Enter type</span>
    )}
  </span>
  <span className="truncate text-xs">
    {representative.email || '—'}
  </span>
  <span className="truncate text-xs">
    {representative.phone_number || '—'}
  </span>
  <div className="flex justify-center items-center space-x-1 w-16">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => setEditingRep(representative)}
      className="h-6 w-6 p-0 flex items-center justify-center"
    >
      <Edit className="h-3 w-3" />
    </Button>
    <DeleteButton
      onDelete={() => deleteRepMutation.mutate(representative.id)}
      title="Delete Representative"
      description={`Are you sure you want to delete ${representative.first_name} ${representative.last_name}?`}
      isLoading={deleteRepMutation.isPending}
      size="icon"
      className="h-6 w-6 p-0"
    />
  </div>
</div>
```

#### Change 5: Add State and Mutations
Add to the `RepresentativeContent` component:
- State for editing representative: `const [editingRep, setEditingRep] = useState(null)`
- Delete mutation with toast notifications and query invalidation
- Import and render `EditRepresentativeDialog` component

#### Change 6: Remove Muted Foreground Colors
Change all data cell text from `text-muted-foreground` to regular `text-xs` so all text has the same color.

## Summary of Visual Changes

| Current | Updated |
|---------|---------|
| Name (combined) | First Name, Last Name (separate columns) |
| Title (plain text) | Type (colored badge or "Enter type" placeholder) |
| Email (muted color) | Email (same color as name) |
| Phone (muted color) | Phone (same color as name) |
| No actions | Actions column with Edit + Delete (centered) |

## Result After Implementation
The Edit Company > Representatives tab will visually match the main Representatives table:
- Separate First Name and Last Name columns
- Type displayed with colored badges (matching the main table)
- All text in consistent colors (not muted)
- Centered Edit and Delete buttons under "Actions" header
- Delete functionality with confirmation dialog
- Edit functionality opening the EditRepresentativeDialog
