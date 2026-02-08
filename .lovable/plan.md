

# Marketplace Sync Plan: Update + Add (Non-Destructive)

## Objective
Keep all 809 existing companies, normalize their type names to match UI taxonomy, then add new companies only for categories under 10.

## Two-Phase Approach

### Phase 1: Normalize Existing Data (SQL Migration)

Update the 12 mismatched type names in the database to match the UI taxonomy:

```sql
-- Direct renames (exact matches)
UPDATE marketplace_companies SET company_type = 'Solar/Renewable Energy Contractor' WHERE company_type = 'Solar/Renewable Energy';
UPDATE marketplace_companies SET company_type = 'Fire Sprinkler Contractor' WHERE company_type = 'Fire Protection/Sprinkler';
UPDATE marketplace_companies SET company_type = 'Cabinet Manufacturer' WHERE company_type = 'Cabinet Maker';
UPDATE marketplace_companies SET company_type = 'Concrete Supplier (Ready-Mix)' WHERE company_type = 'Ready-Mix Concrete';

-- Split combined types (assign to first type, the populate step will add more to second)
UPDATE marketplace_companies SET company_type = 'Low Voltage Contractor' WHERE company_type = 'Low Voltage/Security';
UPDATE marketplace_companies SET company_type = 'Deck Contractor' WHERE company_type = 'Deck/Fence Contractor';
UPDATE marketplace_companies SET company_type = 'Window Installer' WHERE company_type = 'Window/Door Installer';
UPDATE marketplace_companies SET company_type = 'Electrical Fixtures Supplier' WHERE company_type = 'Fixture Supplier';
UPDATE marketplace_companies SET company_type = 'Construction Lender' WHERE company_type = 'Lender';
UPDATE marketplace_companies SET company_type = 'Financial Advisor' WHERE company_type = 'Finance';

-- Generic types that need re-categorization based on business focus
-- Attorney/Legal Services - will be addressed in Phase 2 by adding new entries
-- Subcontractor - too generic, leave as-is or delete
```

### Phase 2: Populate Missing/Underfilled Categories

Update the `populate-marketplace` edge function to:

1. **Check existing counts first** - Query DB for each category count before searching
2. **Only search if count < 10** - Skip categories that already have 10+
3. **Target exactly what's needed** - If category has 7, search for 5 more (to get to ~10-12)
4. **Handle Legal Services specially** - Since `Attorney/Legal Services` is generic, search for each specific legal type

### Files to Change

**1. SQL Migration (one-time)**
- Normalize 10 mismatched type names
- No data loss, just renaming

**2. `supabase/functions/populate-marketplace/index.ts`**
- Add pre-check: query existing counts per category
- Skip categories with 10+ companies
- Calculate `needed = max(0, targetPerCategory - existingCount)`
- Only make Google API calls for underfilled categories

### Expected Outcome

| Category | Before | After |
|----------|--------|-------|
| Types with 10+ | 38 | 175 |
| Legal Services | 0 (5 generic) | 100 (10 × 10 types) |
| Material Suppliers | ~15 | ~180 |
| Specialty Contractors | ~25 | ~130 |

### Cost Estimate

Only need to search ~100 categories (175 - ~75 already filled):
- ~100 Nearby Search calls × $0.032 = $3.20
- ~100 × 10 Place Details calls × $0.017 = $17.00
- **Total: ~$20** (vs $50 for full re-sync)

### Implementation Steps

1. Run SQL migration to normalize type names
2. Update edge function with "smart fill" logic
3. Trigger population via Admin panel (MarketplacePopulator)
4. Verify all 175 types have 10+ companies

