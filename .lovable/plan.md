

## Fix: Prioritize Exact Amount PO Match Over Largest PO

### Problem
The $239.80 bill (cost code 4330: Lumber & Framing) has an exact-match PO for $239.80, but the disambiguation logic picks the **largest** PO ($27,647.92) when multiple POs fit within budget. This causes it to display as "Draw" instead of "Matched."

### Root Cause
Lines 218-226 of `useBillPOMatching.ts`: when multiple POs can accommodate the bill amount, the code always picks the largest PO. It never checks if one PO's total amount exactly equals the bill line amount.

### Fix
**`src/hooks/useBillPOMatching.ts` — lines 218-226**

Before falling back to "pick largest PO," check if any fitting PO has `total_amount` exactly equal to the bill line amount. If so, use that PO.

```typescript
if (fittingPos.length > 1) {
  // First: prefer PO whose total matches the bill line exactly
  const exactMatch = fittingPos.find(p => (p.total_amount || 0) === lineAmount);
  if (exactMatch) {
    resolvedPoId = exactMatch.id;
  } else {
    // Fallback: pick largest PO
    let bestPo = fittingPos[0];
    for (let i = 1; i < fittingPos.length; i++) {
      if ((fittingPos[i].total_amount || 0) > (bestPo.total_amount || 0)) {
        bestPo = fittingPos[i];
      }
    }
    resolvedPoId = bestPo.id;
  }
}
```

Also apply the same exact-match-first check in the "no PO can accommodate" fallback (lines 228-235) so even if the exact PO is fully billed, it still gets preferred over a random large PO.

One file, one logic change. The $239.80 bill will match to the $239.80 PO and show "Matched" instead of "Draw."

