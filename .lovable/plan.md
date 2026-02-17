

## Fix: Reallocate INV0012 Bill Line to Correct Cost Code

### Problem

The $4,206 invoice (INV0012) has two bill lines:
- **$3,206** "First floor balance" with cost code 4370 (Framing Labor) -- this correctly matches the "First floor" PO line (shown in green)
- **$1,000** "Deck framing draw" with cost code 4370 (Framing Labor) -- this INCORRECTLY matches "Beauty bands at decks" because that PO line also has cost code 4370 and contains the word "deck"

The $1,000 bill line should have cost code **4810: Decks**, not 4370. Once corrected, the three-tier matching logic will:
1. Find two PO lines with cost code 4810: "Decks" ($2,232) and "Rear deck and roof" ($1,500)
2. Compare memo "Deck framing draw" against both descriptions
3. Match to "Decks" (higher keyword overlap) and display it in green

### Solution

**Data fix** -- Update the cost_code_id on the $1,000 bill line from 4370 (Framing Labor) to 4810 (Decks):

| Field | Current Value | New Value |
|-------|--------------|-----------|
| Bill line ID | a2c39cb4-76ae-42eb-981e-f4225577ffe4 | (unchanged) |
| Memo | Deck framing draw | (unchanged) |
| Amount | $1,000.00 | (unchanged) |
| cost_code_id | d576bac6 (4370: Framing Labor) | dae802c0 (4810: Decks) |

No code changes are needed -- the matching logic already handles this correctly when the cost code is accurate.

### Expected Result

After the data fix, the PO Details dialog for PO 2025-115E-0006 will show:
- **First floor**: $3,206 billed (green, from INV0012)
- **Decks**: $1,000 billed (green, from INV0012)
- **Beauty bands at decks**: $0.00 billed
- **Unallocated**: $0.00

### Technical Details

One SQL update statement to change the cost_code_id on the affected bill line. This also corrects the job cost reporting so the $1,000 is categorized under Decks rather than Framing Labor.

