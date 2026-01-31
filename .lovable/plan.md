

# Plan: Enhanced AI Bill Extraction Intelligence System

## Current State Summary

The system already has foundational intelligence in place:

### What's Working Well
1. **Vendor Matching Pipeline**
   - Vendor aliases for exact name normalization
   - Acronym matching (e.g., "JZSE" → "JZ Structural Engineering")
   - Fuzzy matching with 80%+ similarity threshold

2. **Single Cost Code Auto-Assignment**
   - When a vendor has **exactly one** cost code in `company_cost_codes`, it's automatically applied to all line items
   - Example: Wire Gill → Legal - Land Use (2240) is auto-assigned every time

3. **Learning Examples Table**
   - `bill_categorization_examples` stores every approved line item with its vendor, description, account, and cost code
   - Currently has 24 examples across 10 vendors
   - Fed to AI as "few-shot learning" examples

4. **AI Prompt Enhancement**
   - Learning examples are grouped by vendor and shown to AI
   - Vendor patterns with 2+ examples get a summary showing most common cost codes
   - Example: "FOUR SEASONS CONSTRUCTION: 4370: Framing Labor (used 4x), 4395: Window & Door Install (used 3x)"

### Intelligence Gaps

1. **Multi-Code Vendors Get No Auto-Assignment**
   - Carter Lumber has 14 cost codes → AI must guess every time
   - Four Seasons has 8 cost codes but historically uses only 2 → no preference applied

2. **No Statistical Confidence Threshold**
   - Even if 90% of a vendor's bills use one cost code, it's not auto-assigned
   - The AI sees patterns but doesn't have authority to force assignment

3. **No Keyword-Based Learning**
   - Invoice description "trusses" should map to `4350: Roof Trusses`
   - Currently relies only on AI inference, not learned rules

4. **No Project-Based Patterns**
   - Some cost codes might be more common for certain project types
   - No tracking of project context in learning

## Proposed Enhancement: Smart Cost Code Inference

### Approach

Create a lightweight enhancement that uses the **existing data** more intelligently, without requiring new tables.

### Part 1: Historical Dominance Auto-Assignment

When a vendor has multiple cost codes but one is used 70%+ of the time in approved bills, auto-assign it.

**Logic Flow:**
```text
1. Vendor matched (e.g., "Four Seasons Construction")
2. Check company_cost_codes → 8 codes assigned
3. Since >1 code, query bill_categorization_examples for this vendor
4. Calculate: Framing Labor = 57%, Window Install = 43%
5. No single code dominates (>70%), so let AI decide
```

But for a vendor like Wire Gill (100% Legal - Land Use), or a vendor with 80%+ on one code, auto-assign it.

**Changes to `extract-bill-data/index.ts`:**

Update `autoAssignSingleCostCode()` to become `autoAssignCostCode()`:

```typescript
async function autoAssignCostCode(
  vendorId: string,
  vendorName: string,
  lineItems: any[],
  supabase: any,
  ownerId: string
): Promise<any[]> {
  // Step 1: Check company_cost_codes for single code (existing logic)
  const { data: vendorCostCodes } = await supabase
    .from('company_cost_codes')
    .select('cost_code_id, cost_codes(id, code, name)')
    .eq('company_id', vendorId);
    
  if (vendorCostCodes?.length === 1) {
    // Existing: Force assign single vendor cost code
    const cc = vendorCostCodes[0].cost_codes;
    return lineItems.map(item => ({
      ...item,
      cost_code_name: `${cc.code}: ${cc.name}`
    }));
  }
  
  // Step 2: Check historical usage patterns
  if (vendorCostCodes?.length > 1) {
    const { data: examples } = await supabase
      .from('bill_categorization_examples')
      .select('cost_code_name')
      .eq('owner_id', ownerId)
      .ilike('vendor_name', vendorName);
    
    if (examples && examples.length >= 3) {
      // Count occurrences
      const counts = {};
      examples.forEach(ex => {
        if (ex.cost_code_name) {
          counts[ex.cost_code_name] = (counts[ex.cost_code_name] || 0) + 1;
        }
      });
      
      // Find dominant code (70%+ usage)
      const total = examples.length;
      for (const [code, count] of Object.entries(counts)) {
        const percentage = (count / total) * 100;
        if (percentage >= 70) {
          console.log(`✅ Historical dominance: ${code} used ${percentage.toFixed(0)}% of time`);
          return lineItems.map(item => ({
            ...item,
            cost_code_name: code
          }));
        }
      }
      console.log(`No dominant cost code (70%+ threshold) for vendor`);
    }
  }
  
  return lineItems; // No auto-assignment
}
```

### Part 2: Improved Learning Summary for AI

Enhance the vendor learning summary to show statistical confidence:

**Current:**
```
FOUR SEASONS CONSTRUCTION:
  Cost Codes:
    • 4370: Framing Labor (used 4x)
    • 4395: Window & Door Install (used 3x)
```

**Enhanced:**
```
FOUR SEASONS CONSTRUCTION (7 past invoices):
  Cost Codes:
    • 4370: Framing Labor - 57% (4/7 invoices) ← most common
    • 4395: Window & Door Install - 43% (3/7 invoices)
  Decision: No dominant pattern (need 70%+). Analyze line descriptions to choose.
```

This gives the AI better context for making decisions.

### Part 3: Keyword Pattern Tracking (Future Enhancement)

**Optional New Table:** `vendor_description_patterns`

```sql
CREATE TABLE vendor_description_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id),
  vendor_name text NOT NULL,
  keyword text NOT NULL,  -- extracted keyword like "trusses", "labor", "trim"
  cost_code_id uuid REFERENCES cost_codes(id),
  cost_code_name text,
  match_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX ON vendor_description_patterns(owner_id, vendor_name, keyword, cost_code_name);
```

This would learn:
- "Carter Lumber" + "trusses" → "4350: Roof Trusses"
- "Carter Lumber" + "siding" → "4610: Exterior Trim"
- "Carter Lumber" + "framing" → "4320: Framing Materials"

However, this is a more complex enhancement that requires:
1. Keyword extraction during approval
2. Pattern matching during extraction
3. UI for reviewing/managing patterns

**Recommendation:** Implement Part 1 and Part 2 first, as they use existing data and provide immediate value. Part 3 can be a future phase.

## Implementation Plan

### Phase 1: Enhanced Auto-Assignment (Immediate)

**Files to Modify:**

1. **`supabase/functions/extract-bill-data/index.ts`**
   - Rename `autoAssignSingleCostCode()` → `autoAssignCostCode()`
   - Add historical dominance check (70% threshold)
   - Add `vendorName` and `ownerId` parameters
   - Update the call site to pass vendor name

2. **Same file - Vendor Learning Summary**
   - Update the vendor pattern summary to show percentages
   - Add decision guidance for the AI

### Phase 2: Keyword Learning (Future)

1. Create new migration for `vendor_description_patterns` table
2. Update `approve_pending_bill` function to extract and store keywords
3. Update extraction to query keyword patterns
4. Add admin UI to view/manage learned patterns

## Expected Results

After Phase 1:

| Vendor | Current Behavior | New Behavior |
|--------|------------------|--------------|
| Wire Gill (1 code) | Auto-assign Legal | Same (no change) |
| Oceanwatch HOA (1 code) | Auto-assign HOA Fees | Same (no change) |
| Four Seasons (8 codes, 57% framing) | AI guesses | AI guesses (below 70%) |
| Hypothetical vendor (90% one code) | AI guesses | **Auto-assign dominant code** |

The system becomes smarter over time as more bills are approved, building statistical confidence for auto-assignment.

## Technical Details

### Threshold Justification: 70%

- 70% means at least 7 out of 10 invoices used this code
- Conservative enough to avoid wrong auto-assignments
- Could be configurable in the future

### Minimum Sample Size: 3 Examples

- Require at least 3 approved examples before considering historical patterns
- Prevents over-fitting on limited data
- Allows quick learning for frequent vendors

### Backward Compatibility

- Existing `bill_categorization_examples` data is immediately usable
- No data migration required
- Edge function update deploys automatically

