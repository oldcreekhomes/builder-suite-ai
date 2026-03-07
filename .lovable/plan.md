

## Fix: Fallback PO Matching Returns Wrong PO When Multiple POs Share Same Cost Code

### Root Cause

In `useBillPOMatching.ts`, when bill lines lack an explicit `purchase_order_id`, the fallback uses `pos.find()` (line 200) to match by vendor + project + cost_code. This returns the **first** PO found. When multiple POs share the same cost code (e.g., two POs for "4330: Lumber & Framing Material" — one for $27,647.92 and one for $239.80), both bills incorrectly match to whichever PO was fetched first.

### Solution

When the fallback finds **multiple** POs for the same vendor + project + cost_code, use **amount proximity** to pick the best match. The bill line amount is compared to each candidate PO's remaining budget, and the closest match wins.

### Changes — `src/hooks/useBillPOMatching.ts`

**Lines 198-208** — Replace the single `pos.find()` with logic that collects all matching POs and selects the one whose `total_amount` is closest to the bill line's amount:

```typescript
// Fallback: if no explicit PO link, match by vendor + project + cost_code
if (!resolvedPoId && line.cost_code_id && bill.vendor_id && bill.project_id) {
  const candidatePos = pos.filter(p =>
    p.company_id === bill.vendor_id &&
    p.project_id === bill.project_id &&
    p.cost_code_id === line.cost_code_id
  );
  if (candidatePos.length === 1) {
    resolvedPoId = candidatePos[0].id;
  } else if (candidatePos.length > 1) {
    // Multiple POs for same cost code — pick by closest amount
    const lineAmount = line.amount || 0;
    let bestPo = candidatePos[0];
    let bestDiff = Math.abs((bestPo.total_amount || 0) - lineAmount);
    for (let i = 1; i < candidatePos.length; i++) {
      const diff = Math.abs((candidatePos[i].total_amount || 0) - lineAmount);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestPo = candidatePos[i];
      }
    }
    resolvedPoId = bestPo.id;
  }
}
```

This ensures the $239.80 bill matches PO 2026-923T-0051 ($239.80) and the $27,647.92 bill matches PO 2025-923T-0005 ($27,647.92).

One file, one section changed.

