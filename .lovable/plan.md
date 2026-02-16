

## Boost Confidence for Cost Code Match When Bill Fits Within PO Remaining

### Problem

The siding line has a matching cost code (4470 - Siding) and the $3,500 bill amount fits within the PO's remaining balance. Yet the confidence is only 65% because the existing overrides only trigger on near-exact amounts (within 1-20% of PO total/remaining). For progress billing (draws), the bill is intentionally less than the PO -- this is normal and should still be high confidence.

### User's Rule (makes perfect sense)

- Cost code matches + bill amount fits within remaining PO balance = HIGH confidence (85%+)
- Cost code matches + bill amount EXCEEDS PO total = LOW confidence (penalize)

### Solution

**File: `src/utils/poLineMatching.ts`**

Add two new overrides after the existing ones (after line 146):

```
// Progress billing: cost code match + bill fits within remaining = 85% minimum
if (ccMatch === 1 && billAmount > 0 && billAmount <= line.remaining) {
  confidence = Math.max(confidence, 85);
}

// Over-PO penalty: cost code match but bill exceeds PO total = cap at 40%
if (ccMatch === 1 && billAmount > 0 && billAmount > line.amount && line.amount > 0) {
  confidence = Math.min(confidence, 40);
}
```

This means:
- **Siding $3,500 draw against PO with remaining balance >= $3,500**: Confidence jumps to 85%+ (green badge)
- **Framing $720 exact match**: Still 95% from the existing override
- **$11,000 bill against $10,000 PO**: Capped at 40% (yellow/low), flagging the over-billing
- If cost codes don't match, none of these overrides apply -- the base scoring handles it

### Priority Order of Overrides

1. Cost code + exact amount (within 1%) = 95% minimum (existing)
2. Cost code + near-exact (within 5%) = 85% minimum (existing)
3. Cost code + bill fits within remaining = 85% minimum (new)
4. Cost code + bill exceeds PO total = capped at 40% (new penalty)

Override 1 and 2 run first, so an exact match still gets 95%. Override 3 catches the progress billing case. Override 4 runs last and can pull the score down if the bill exceeds the PO.

### Files Changed

| File | Change |
|------|--------|
| `src/utils/poLineMatching.ts` | Add "fits within remaining" boost (85%) and "over PO" penalty (cap 40%) |

