

# Populate Marketplace with Massive Google Places Import

## Current State

- **290 companies** currently in database (old category names)
- **175 new categories** defined in the edge function
- **0 companies** imported for new categories like "Construction Attorney", "Cabinet Manufacturer", etc.

## The Plan: Trigger Full Import

Simply invoke the `populate-marketplace` edge function to run the massive import. The function is already configured to:
- Process all 175 company types
- Fetch 10 companies per category (already set in code)
- Search 50-mile radius around Washington D.C.
- Filter for 4.0+ star ratings

## Expected Results

| Metric | Current | After Import |
|--------|---------|--------------|
| Company Types | 62 (old) | **175+ (new)** |
| Companies per Type | 5 | **10** |
| Total Companies | 290 | **1,750+** |

## Cost Estimate

- 175 categories × ~10 Place Details API calls = ~1,750 calls
- Cost: ~$29.75 (at $0.017/call)
- One-time import cost is well worth it for $100/month per company revenue

## Implementation

1. **Call the edge function** with default parameters to trigger full import
2. **Function processes** all 175 categories automatically
3. **Deduplication** - skips companies already in database by name+address
4. **New companies** get inserted with new category names

## No Code Changes Needed

The edge function is already configured correctly with:
- `maxResultsPerCategory = 10` (already set)
- All 175 category mappings (already in place)
- Deduplication logic (already working)

I just need to **invoke the edge function** to trigger the import.

