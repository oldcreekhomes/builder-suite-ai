
# Fix Plan: Type Placeholder and Actions Button Alignment

## Issues to Fix

### Issue 1: Type Placeholder Text Inconsistency
Currently when no type is selected:
- Phone shows: "Enter phone"
- Type shows: "Select type" (in code) but appears as "Not Specified" 

**Change:** Update the placeholder from "Select type" to "Enter type" for consistency.

### Issue 2: Actions Buttons Not Aligned Under Header
The Edit and Delete buttons appear left-aligned within their cell, but the "Actions" header is right-aligned. The buttons need to be positioned directly under the Actions header on the right side.

**Root cause:** The DeleteButton component doesn't have explicit size constraints like the Edit button does. Need to ensure both buttons are properly sized and the flex container pushes them to the right edge.

---

## Files to Modify

### File 1: `src/components/representatives/RepresentativesTable.tsx`

#### Change 1: Update Type Placeholder (line 335)
**Current:**
```tsx
{rep.title ? representativeTypes.find(t => t.value === rep.title)?.label || rep.title : 'Select type'}
```

**Change to:**
```tsx
{rep.title ? representativeTypes.find(t => t.value === rep.title)?.label || rep.title : 'Enter type'}
```

#### Change 2: Fix Actions Cell Button Alignment (lines 397-416)
The current structure has the buttons in a flex container but they're not properly constrained. Need to add explicit sizing to DeleteButton.

**Current:**
```tsx
<TableCell className="px-2 py-1 text-right align-middle">
  <div className="flex justify-end items-center space-x-1">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => handleEditClick(rep)}
      className="h-6 w-6 p-0 flex items-center justify-center"
    >
      <Edit className="h-3 w-3" />
    </Button>
    <div className="flex items-center">
      <DeleteButton
        onDelete={() => deleteRepMutation.mutate(rep.id)}
        title="Delete Representative"
        description={`Are you sure you want to delete ${rep.first_name} ${rep.last_name}? This action cannot be undone.`}
        isLoading={deleteRepMutation.isPending}
      />
    </div>
  </div>
</TableCell>
```

**Change to:**
```tsx
<TableCell className="px-2 py-1 align-middle">
  <div className="flex justify-end items-center space-x-1">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => handleEditClick(rep)}
      className="h-6 w-6 p-0 flex items-center justify-center"
    >
      <Edit className="h-3 w-3" />
    </Button>
    <DeleteButton
      onDelete={() => deleteRepMutation.mutate(rep.id)}
      title="Delete Representative"
      description={`Are you sure you want to delete ${rep.first_name} ${rep.last_name}? This action cannot be undone.`}
      isLoading={deleteRepMutation.isPending}
      size="icon"
      className="h-6 w-6 p-0"
    />
  </div>
</TableCell>
```

Key changes:
- Remove the extra wrapping `<div className="flex items-center">` around DeleteButton
- Add `size="icon"` and `className="h-6 w-6 p-0"` to DeleteButton to match Edit button sizing

---

### File 2: `src/components/marketplace/MarketplaceRepresentativesTable.tsx`

#### Change: Fix Actions Cell Button Sizing (lines 156-172)

**Current:**
```tsx
<TableCell className="px-2 py-1 text-right">
  <div className="flex justify-end items-center space-x-1">
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
      onClick={() => handleEditClick(rep)}
    >
      <Edit className="h-3 w-3" />
    </Button>
    <DeleteButton
      onDelete={() => deleteRepresentativeMutation.mutate(rep.id)}
      title="Delete Representative"
      description="Are you sure you want to delete this representative? This action cannot be undone."
      isLoading={deleteRepresentativeMutation.isPending}
    />
  </div>
</TableCell>
```

**Change to:**
```tsx
<TableCell className="px-2 py-1 align-middle">
  <div className="flex justify-end items-center space-x-1">
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
      onClick={() => handleEditClick(rep)}
    >
      <Edit className="h-3 w-3" />
    </Button>
    <DeleteButton
      onDelete={() => deleteRepresentativeMutation.mutate(rep.id)}
      title="Delete Representative"
      description="Are you sure you want to delete this representative? This action cannot be undone."
      isLoading={deleteRepresentativeMutation.isPending}
      size="icon"
      className="h-6 w-6 p-0"
    />
  </div>
</TableCell>
```

Key changes:
- Add `size="icon"` and `className="h-6 w-6 p-0"` to DeleteButton to match Edit button

---

### File 3: `src/components/ui/delete-button.tsx`

#### Change: Support "icon" size properly

The DeleteButton component needs to accept `size="icon"` as a valid option.

**Current (line 11):**
```tsx
size?: "default" | "sm" | "lg" | "icon";
```

This already supports "icon" - good!

---

## Summary of Changes

| File | Change |
|------|--------|
| RepresentativesTable.tsx | Change "Select type" to "Enter type"; fix DeleteButton sizing with `size="icon"` and `className="h-6 w-6 p-0"` |
| MarketplaceRepresentativesTable.tsx | Fix DeleteButton sizing with `size="icon"` and `className="h-6 w-6 p-0"` |

## Result After Implementation

1. Empty type fields will show "Enter type" placeholder (matching "Enter phone" style)
2. Edit and Delete buttons will be properly sized at 24x24 pixels (h-6 w-6)
3. Both buttons will appear right-aligned directly under the "Actions" header
