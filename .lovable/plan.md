

## Fix Confidence Scoring and Incorrect Billed-to-Date

### Problem 1: 72% Confidence on an Exact Match

When cost code matches AND the dollar amount is exact, the score should be very high (90%+) regardless of keyword similarity. Currently, weak keyword overlap drags the score down even when the two strongest signals (cost code + exact amount) are perfect.

**Fix**: Add a "perfect match override" in `matchBillLineToPOLines`. When cost code matches AND amount is within 1% of PO remaining or total, set the confidence floor to 95%. This is a simple post-scoring check that recognizes the strongest possible match signal.

**File**: `src/utils/poLineMatching.ts`

In the scoring loop (after line 136), add:

```text
// Perfect match override: cost code match + exact amount = 95% minimum
if (ccMatch === 1 && exactBonus >= 1.0) {
  confidence = Math.max(confidence, 95);
}
// Strong match: cost code match + near-exact amount = 85% minimum
if (ccMatch === 1 && exactBonus >= 0.7) {
  confidence = Math.max(confidence, 85);
}
```

This ensures an exact $720/$720 match with matching cost code always shows 95%+ regardless of keyword overlap.

### Problem 2: $12,885 Billed-to-Date on a $720 PO

The implicit cost-code billing logic at line 211 in `useVendorPurchaseOrders.ts` attributes ALL unlinked historical bills with the same cost code to this PO. This is wrong because:
- Old bills were for different work/POs that were never explicitly linked
- A brand new $720 PO shouldn't inherit $12,885 of prior billing history

**Fix**: Remove the implicit cost-code billing entirely. It was a fallback for before explicit PO linking existed, but now that the system has proper `purchase_order_id` and `purchase_order_line_id` tracking on bill lines, the implicit logic creates false data. Only explicitly linked billing should count.

**File**: `src/hooks/useVendorPurchaseOrders.ts`

Changes:
1. Remove the implicit billing query (lines 152-172) and the `billedByCostCode` map
2. Remove the implicit billing calculation at lines 210-213
3. Simplify `totalBilled` to just `lineLevelBilled + poLevelOnlyBilled`

The total billed calculation becomes:

```text
const totalBilled = lineLevelBilled + poLevelOnlyBilled;
```

This means only bills that are explicitly linked to the PO (via `purchase_order_id` or `purchase_order_line_id`) will count toward "Billed to Date". For the $720 PO with no bills linked yet, it will correctly show $0.00 billed and $720.00 remaining.

### Summary

| File | Change |
|------|--------|
| `src/utils/poLineMatching.ts` | Add perfect-match override: cost code + exact amount = 95% confidence minimum |
| `src/hooks/useVendorPurchaseOrders.ts` | Remove implicit cost-code-based billing; only count explicitly linked bills |

### Expected Results

- **$720 Framing Labor line**: Confidence badge shows 95% (green) instead of 72%
- **PO 2026-115E-0056 info popup**: Shows $0.00 Billed to Date, $720.00 Remaining (instead of $12,885 billed / -$12,165 remaining)
- No "Over Budget" warning on a fresh PO that hasn't been billed yet

