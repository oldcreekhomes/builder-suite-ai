

## Fix PO Matching Confidence Scores

### Problem

The scoring algorithm in `poLineMatching.ts` has three fundamental flaws producing artificially low confidence scores:

1. **One-directional keyword scoring** penalizes verbose bill memos. "Siding draw" vs "Siding" scores 50% keyword match (1/2 bill tokens matched) when it should be 100% (all PO tokens found in bill).

2. **No word stemming**. "deck" does not exact-match "decks" -- it only matches via substring which still counts, but a simple stem strip would improve clarity and edge cases.

3. **No exact-amount bonus**. A $720 bill matching a $720 PO gets the same 25 points as any close amount. An exact or near-exact match should be a strong additional signal.

### Solution: Rewrite Scoring in `poLineMatching.ts`

**Change 1: Bidirectional keyword scoring**

Instead of only measuring "what % of bill tokens matched PO tokens", take the MAX of both directions:
- bill-to-PO ratio: what fraction of bill tokens found in PO (current approach)
- PO-to-bill ratio: what fraction of PO tokens found in bill (NEW)

This means "Siding draw" vs "Siding" = max(0.5, 1.0) = 1.0 because 100% of PO tokens ("siding") appear in the bill.

**Change 2: Simple stemming**

Strip common suffixes (trailing 's', 'ing', 'ed') before comparison so "deck" = "decks", "framing" = "frame", etc. This is lightweight and avoids a dependency.

**Change 3: Exact/near-exact amount bonus**

Add a bonus component (up to 15 points) when the bill amount is within 5% of the PO line's remaining or total amount. An exact dollar match (like $720 = $720) gets the full 15 points.

**Change 4: Rebalanced weights**

| Signal | Old Weight | New Weight |
|--------|-----------|------------|
| Keyword match | 45 | 40 |
| Cost code match | 30 | 25 |
| Amount proximity | 25 | 20 |
| Exact amount bonus | 0 | 15 |
| **Total possible** | **100** | **100** |

### Expected Scores After Fix

**"Deck balance" vs PO "Decks":**
- Keyword: max(1/2, 1/1) = 1.0 (all PO tokens found) -> 40 pts
- Cost code: mismatch -> 0 pts
- Amount proximity: ~0.9 -> 18 pts
- Near-exact bonus: ~10 pts
- **Total: ~68%** (up from 45%) -- yellow badge, reasonable

**"Siding draw" vs PO "Siding":**
- Keyword: max(1/2, 1/1) = 1.0 -> 40 pts
- Cost code: match -> 25 pts
- Amount proximity: ~0.3 -> 6 pts
- Exact bonus: 0
- **Total: ~71%** (up from 60%) -- but wait, if "siding" PO has remaining = $11,220 it won't get exact bonus. Still solid yellow.

Actually with cost code match + perfect keyword, that's already 65 pts minimum. Good.

**"$720 framing" vs PO $720:**
- Keyword: After stemming, "framing" stems to "frame". Bill memo tokens include "wall", "ground", "floor" etc. Still 0 keyword match (no "frame" in bill tokens... unless we also stem bill tokens).
- Actually with stemming: billTokens would include "add" (from "added"), "wall", "around", "pile" (from "piles"), "ground", "floor", "men", "8hrs", "30". poTokens = ["frame"]. Still no match.
- Cost code: match -> 25 pts
- Amount: exact -> 20 pts
- Exact bonus: 15 pts
- **Total: ~60%** (similar to before but more honest)

Hmm, the $720 line is tricky because "Added wall around piles ground floor 3 men 8hrs at $30" has NO keyword overlap with "Framing Labor". But the exact amount + cost code match should signal high confidence. Let me adjust: when amount is an EXACT match AND cost code matches, add an additional boost. Or simply increase the exact-amount bonus weight.

**Revised weights for better exact-match handling:**

| Signal | Weight |
|--------|--------|
| Keyword match (bidirectional) | 35 |
| Cost code match | 25 |
| Amount proximity | 15 |
| Exact/near-exact amount bonus | 25 |
| **Total** | **100** |

This way $720 exact + cost code = 25 + 15 + 25 = **65%** minimum. With the exact proximity score being 1.0 that's 25 + 15 + 25 = **65%**. Still yellow but much more meaningful.

### Technical Details

**File: `src/utils/poLineMatching.ts`**

Changes to the matching function:

1. Add `stem()` helper that strips trailing 's', 'es', 'ing', 'ed', 'tion' from words
2. Apply stemming in `tokenize()`
3. Change `keywordScore()` to be bidirectional: `Math.max(billToPoRatio, poToBillRatio)`
4. Add `exactAmountBonus()` function: returns 0-1 based on how close bill amount is to PO remaining/total (1.0 = within 1%, 0.5 = within 10%, 0 = beyond 20%)
5. Update weight constants: keyword=35, costCode=25, amountProximity=15, exactBonus=25
6. Remove "balance", "draw", "added" and similar billing verbs from stop words or add them

### File Summary

| File | Change |
|------|--------|
| `src/utils/poLineMatching.ts` | Bidirectional keyword scoring, stemming, exact-amount bonus, rebalanced weights |

