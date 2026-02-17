

## Fix: Smart Memo-Based Matching for PO-Level Billing Distribution

### Problem

The cost_code matching we added lumps all billing onto the first PO line when multiple lines share the same cost code. For PO 2025-115E-0006, 14 out of 17 lines share cost code 4370 (Framing Labor), so all $11,206 in billing gets attributed to "Ground floor" (the first 4370 line).

The bill lines have descriptive memos that should guide the matching:
- "Second floor framing draw" ($7,000) should match "2nd floor" PO line
- "First floor balance" ($3,206) should match "First floor" PO line
- "Deck framing draw" ($1,000) should match "Decks" PO line

### Solution

**File: `src/hooks/useVendorPurchaseOrders.ts`**

Update the PO-level billing distribution logic (lines 140-172) with a three-tier matching strategy:

1. **Unique cost code match**: If exactly ONE PO line has the matching cost_code_id, attribute to it (current behavior, but only when unique)
2. **Memo-to-description keyword match**: When multiple PO lines share the same cost code, compare the bill line's memo against each PO line's description using keyword overlap to find the best match
3. **Unallocated fallback**: If no confident match is found, keep as unallocated

### Technical Details

**Add `memo` to the poBilled query** (line 136) so it's available for matching.

**Matching function** - simple keyword overlap scorer:
- Tokenize bill line memo and PO line description into lowercase words
- Count matching tokens (with basic normalization: "2nd" matches "second", "deck" matches "decks")
- Select the PO line with the highest overlap score, requiring at least 1 keyword match

```text
Example matches:
  memo "Second floor framing draw" vs description "2nd floor" -> 2 matches ("second/2nd", "floor")
  memo "Second floor framing draw" vs description "Ground floor" -> 1 match ("floor")
  -> Best match: "2nd floor" (score 2 vs 1)

  memo "Deck framing draw" vs description "Decks" -> 1 match ("deck/decks")
  memo "Deck framing draw" vs description "Ground floor" -> 0 matches
  -> Best match: "Decks"
```

**Scoring priority**: Among PO lines with the same cost code, pick the one with the highest keyword overlap. If tied or no keywords match, keep as unallocated.

### Expected Result

- "2nd floor" shows $7,000 billed (green for INV0010)
- "First floor" shows $3,206 billed
- "Decks" shows $1,000 billed
- "Ground floor" shows $0.00 billed
- Unallocated drops to $0

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useVendorPurchaseOrders.ts` | Add memo to query; implement three-tier matching (unique cost code, memo keyword overlap, unallocated fallback) |

