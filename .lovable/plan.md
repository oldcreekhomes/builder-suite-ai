
# Fix Plan: Type Placeholder Styling and Actions Centering

## Issues to Address

### Issue 1: Type Field Styling When Empty
**Current behavior:** When no type is selected, showing "Enter type" inside a gray badge (black background visible)
**Desired behavior:** When no type is selected, show "Enter type" as plain grayed-out text (exactly like "Enter phone")

The solution is to conditionally render:
- If `rep.title` exists: show the colored Badge
- If no title: show plain gray text "Enter type" without any Badge wrapper

### Issue 2: Actions Buttons Alignment
**Current behavior:** Edit/Delete buttons are right-aligned (`justify-end`)
**Desired behavior:** Center the buttons directly under the "Actions" header

Changes needed:
- Change "Actions" header from `text-right` to `text-center`
- Change the buttons container from `justify-end` to `justify-center`

---

## Files to Modify

### File 1: `src/components/representatives/RepresentativesTable.tsx`

#### Change A: Fix Type placeholder styling (lines 333-337)
Replace the current Badge-always approach with conditional rendering:

**Current:**
```tsx
<SelectTrigger className="...">
  <Badge className={`${getTypeColor(rep.title || '')} text-[10px] px-1 py-0 border-0`}>
    {rep.title ? representativeTypes.find(t => t.value === rep.title)?.label || rep.title : 'Enter type'}
  </Badge>
</SelectTrigger>
```

**Change to:**
```tsx
<SelectTrigger className="...">
  {rep.title ? (
    <Badge className={`${getTypeColor(rep.title)} text-[10px] px-1 py-0 border-0`}>
      {representativeTypes.find(t => t.value === rep.title)?.label || rep.title}
    </Badge>
  ) : (
    <span className="text-xs text-gray-400">Enter type</span>
  )}
</SelectTrigger>
```

#### Change B: Center Actions header (line 302)
**Current:** `text-right`
**Change to:** `text-center`

#### Change C: Center action buttons (line 398)
**Current:** `justify-end`
**Change to:** `justify-center`

---

### File 2: `src/components/marketplace/MarketplaceRepresentativesTable.tsx`

#### Change A: Center Actions header (line 128)
**Current:** `text-right`
**Change to:** `text-center`

#### Change B: Center action buttons (line 157)
**Current:** `justify-end`
**Change to:** `justify-center`

---

## Summary

| File | Changes |
|------|---------|
| RepresentativesTable.tsx | Show plain gray "Enter type" text when no type selected; center Actions header and buttons |
| MarketplaceRepresentativesTable.tsx | Center Actions header and buttons |

## Result After Implementation

1. Empty type fields will show "Enter type" in plain gray text (matching "Enter phone" style exactly)
2. When a type is selected, it will display as a colored badge (unchanged)
3. Edit/Delete buttons will be centered directly under the "Actions" header in both tables
