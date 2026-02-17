

## Fix: PO Matching Shows Wrong PO When Multiple POs Share Same Cost Code

### Root Cause
The `useBillPOMatching` hook builds a lookup Map keyed by `project_id|company_id|cost_code_id`. When two POs exist for the same vendor, project, and cost code (e.g., PO 2025-115E-0006 for $37,593 and PO 2026-115E-0056 for $720), the second one overwrites the first. The bill then incorrectly matches to the $720 PO instead of the $37,593 one.

### Solution
Change the `poLookup` Map from storing a single PO per composite key to storing an **array of POs**. When auto-matching a bill line, add **all** POs that share the composite key as matches (deduplicating by `po_id`).

### Technical Details

**File: `src/hooks/useBillPOMatching.ts`** (lines ~178-248)

1. Change `poLookup` value type from a single object to an **array** of objects
2. In the `pos.forEach` loop, push to the array instead of overwriting
3. In the `allLines.forEach` matching logic, when a line has no explicit `purchase_order_id`, look up the array of POs for the composite key and add **all** of them as matches (skipping duplicates)

This ensures that when a bill line for "4370: Framing Labor" is auto-matched, both PO 2025-115E-0006 ($37,593) and PO 2026-115E-0056 ($720) appear in the summary dialog, giving the user full visibility into all relevant POs.

