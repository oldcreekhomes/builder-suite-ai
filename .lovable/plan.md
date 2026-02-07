

# Standardization Plan: Representatives and Marketplace Representatives Tables

## Summary of Changes

This plan addresses 5 specific issues to make the Representatives and Marketplace Representatives tables uniform.

---

## Change 1: Rename Tab "Marketplace Reps" to "Marketplace Representatives"

**File:** `src/pages/Companies.tsx`

**Current (line 56):**
```tsx
<TabsTrigger value="marketplace-representatives">Marketplace Reps</TabsTrigger>
```

**Change to:**
```tsx
<TabsTrigger value="marketplace-representatives">Marketplace Representatives</TabsTrigger>
```

---

## Change 2: Add Colored Badge for Type in Representatives Table

Currently, the Representatives table shows the Type as plain text in a dropdown. The Marketplace Representatives table shows a colored badge. We will add the same colored badge styling to the Representatives table.

**File:** `src/components/representatives/RepresentativesTable.tsx`

The `getTypeColor` function already exists (lines 213-224) but isn't used for display. We need to show a Badge with the type color alongside the Select dropdown, or modify the Select display to show the badge.

**Approach:** Display the current type as a colored Badge, and when clicked, it opens the Select to change it.

**Changes:**
- Modify the Type cell (lines 318-337) to display a colored Badge when a type is selected
- Add more type colors to the `getTypeColor` function to cover all types (superintendent, sales rep, owner, office manager, accountant)

---

## Change 3: Remove Icons from Email and Phone in Marketplace Representatives

**File:** `src/components/marketplace/MarketplaceRepresentativesTable.tsx`

**Current Email cell (lines 150-158):**
```tsx
<TableCell className="px-2 py-1">
  {rep.email ? (
    <div className="flex items-center space-x-1">
      <Mail className="h-3 w-3 text-gray-400" />
      <span className="text-xs">{rep.email}</span>
    </div>
  ) : (
    <span className="text-gray-400 text-xs">-</span>
  )}
</TableCell>
```

**Change to:**
```tsx
<TableCell className="px-2 py-1">
  <span className="text-xs">{rep.email || '-'}</span>
</TableCell>
```

**Current Phone cell (lines 160-168):**
```tsx
<TableCell className="px-2 py-1">
  {rep.phone_number ? (
    <div className="flex items-center space-x-1">
      <Phone className="h-3 w-3 text-gray-400" />
      <span className="text-xs">{rep.phone_number}</span>
    </div>
  ) : (
    <span className="text-gray-400 text-xs">-</span>
  )}
</TableCell>
```

**Change to:**
```tsx
<TableCell className="px-2 py-1">
  <span className="text-xs">{rep.phone_number || '-'}</span>
</TableCell>
```

Also remove the unused Mail and Phone imports from line 13.

---

## Change 4: Right-Align Action Buttons Under Actions Header

Both tables currently have the buttons left-aligned within the Actions cell despite the header being right-aligned.

### Representatives Table
**File:** `src/components/representatives/RepresentativesTable.tsx`

**Current (lines 385-404):**
```tsx
<TableCell className="px-2 py-1 text-right align-middle">
  <div className="flex justify-end items-center space-x-1">
```
This looks correct but let me verify the actual rendering.

### Marketplace Representatives Table
**File:** `src/components/marketplace/MarketplaceRepresentativesTable.tsx`

**Current (lines 170-187):**
```tsx
<TableCell className="px-2 py-1">
  <div className="flex items-center space-x-1">
```

**Change to:**
```tsx
<TableCell className="px-2 py-1 text-right">
  <div className="flex justify-end items-center space-x-1">
```

---

## Change 5: Fix Company Column Width in Representatives Table

The issue is that long company names are wrapping to two rows. The solution is to allow the company column more space by reducing the Email column's minimum width.

**File:** `src/components/representatives/RepresentativesTable.tsx`

**Current Email header (line 287):**
```tsx
<TableHead className="h-8 px-2 py-1 text-xs font-medium min-w-[320px] pr-4">Email</TableHead>
```

**Change to:**
```tsx
<TableHead className="h-8 px-2 py-1 text-xs font-medium min-w-[200px]">Email</TableHead>
```

**Current Email cell (line 339):**
```tsx
<TableCell className="px-2 py-1 align-middle min-w-[320px] pr-4">
```

**Change to:**
```tsx
<TableCell className="px-2 py-1 align-middle min-w-[200px]">
```

Also add `whitespace-nowrap` to the Company cell to prevent wrapping:

**Current Company cell (line 317):**
```tsx
<TableCell className="px-2 py-1 text-xs align-middle">{rep.companies?.company_name}</TableCell>
```

**Change to:**
```tsx
<TableCell className="px-2 py-1 text-xs align-middle whitespace-nowrap">{rep.companies?.company_name}</TableCell>
```

---

## Technical Details: Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Companies.tsx` | Rename tab from "Marketplace Reps" to "Marketplace Representatives" |
| `src/components/representatives/RepresentativesTable.tsx` | Add colored Badge for Type, reduce Email min-width, add whitespace-nowrap to Company |
| `src/components/marketplace/MarketplaceRepresentativesTable.tsx` | Remove icons from Email/Phone, right-align action buttons |

---

## Result After Implementation

1. Tab will read "Marketplace Representatives" instead of "Marketplace Reps"
2. Type column in Representatives will show colored badges matching Marketplace Representatives style
3. Email and Phone in Marketplace Representatives will show plain text without icons
4. Edit/Delete buttons will appear directly under the Actions header in both tables
5. Company names in Representatives table will stay on one line

