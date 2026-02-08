

# Fix Marketplace Companies Table Layout

## Overview

This plan will completely overhaul the marketplace table layout based on your feedback:

1. **Remove the gap** between Company Name and Type columns
2. **Delete Source column** (no longer showing "Google")
3. **Remove Specialties** - from UI AND database
4. **Split Contact into two columns**: "Phone" and "Website" (side by side, not stacked)
5. **Remove Actions column** entirely

## Current vs New Column Structure

| Current Layout (8 cols) | New Layout (6 cols) |
|------------------------|---------------------|
| Company Name           | Company Name        |
| Type                   | Type                |
| Source                 | ~~REMOVED~~         |
| Location               | Location            |
| Rating                 | Rating              |
| Specialties            | ~~REMOVED~~         |
| Contact (stacked)      | Phone               |
|                        | Website             |
| Actions                | ~~REMOVED~~         |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/marketplace/MarketplaceCompaniesTable.tsx` | Rebuild table with new 6-column layout |
| `src/components/marketplace/ViewMarketplaceCompanyDialog.tsx` | Remove specialties section from dialog |
| Database migration | Drop the `specialties` column from `marketplace_companies` |
| `src/integrations/supabase/types.ts` | Auto-regenerated after migration |

## Implementation Details

### 1. MarketplaceCompaniesTable.tsx Changes

**Header Row (new structure):**
```
Company Name | Type | Location | Rating | Phone | Website
```

**Row Layout:**
- Company Name: Normal width, left-aligned
- Type: Badge with color coding
- Location: MapPin icon + truncated address
- Rating: Star icon + rating + review count
- Phone: Phone number as plain text (or dash if empty)
- Website: Clickable link (or dash if empty)

**Remove:**
- Source column and badge
- Specialties column
- Contact column (replaced by separate Phone/Website)
- Actions column and Details button
- ViewMarketplaceCompanyDialog state and component import

### 2. ViewMarketplaceCompanyDialog.tsx Changes

Remove the "Specialties" section (lines 151-163) since we're dropping that data from the database entirely.

### 3. Database Migration

```sql
ALTER TABLE marketplace_companies DROP COLUMN IF EXISTS specialties;
```

This permanently removes the specialties array column from the database.

## Technical Notes

- The `colSpan` for empty state will change from 8 to 6
- The interface `MarketplaceCompany` will be updated to remove `specialties` after migration
- Phone and Website columns will show a dash "-" when data is missing
- The table will be more compact and scannable without the cluttered layout

