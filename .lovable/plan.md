

## Fix: Cost Code Search Should Include Subcategories When Parent Matches

### Problem
When searching "concrete" in the Cost Codes settings, only the parent code 4275 (Concrete) appears. Its subcategories (4275.1 Footings & Walls, 4275.2 Basement Slab, etc.) are filtered out because their names don't contain "concrete."

### Root Cause
The search filter in `CostCodesTab.tsx` (lines 68-85) has logic to include **parents when a child matches**, but lacks the reverse: including **children when a parent matches**.

### Fix
In `src/components/settings/CostCodesTab.tsx`, add a second pass that collects the codes of all matched parents, then includes any child whose `parent_group` matches one of those codes.

**Current logic (line 68-85):**
```
1. Find direct matches (code or name contains query)
2. Collect parent_group values from matched children
3. Include parents of matched children
```

**Updated logic:**
```
1. Find direct matches (code or name contains query)
2. Collect parent_group values from matched children -> include those parents
3. Collect codes of matched parents -> include their children
4. Return union of all
```

### Technical Detail
After building the `parentGroupsToInclude` set (for pulling in parents of matched children), add a `childGroupsToInclude` set that contains the `code` of every direct match. Then in the final filter, also include cost codes whose `parent_group` is in `childGroupsToInclude`.

### File Changed
| File | Change |
|------|--------|
| `src/components/settings/CostCodesTab.tsx` | Add child-inclusion logic to the `filteredCostCodes` memo (lines 68-85) |

### Expected Result
Searching "concrete" will show 4275 (Concrete) plus all its subcategories (4275.1 through 4275.5), and similarly for any other parent code matched by search.

