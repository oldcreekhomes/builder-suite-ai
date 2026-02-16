

## Reallocate INV0012 ($4,206) to Four Seasons PO Lines

### Data Changes (via migration)

Since the read-query tool is read-only, I'll use a database migration to perform these data operations:

**Step 1 -- Update existing bill line** (`1fe171b1-...`)
- Change amount from $4,206 to $3,206
- Link to "First floor" PO line (`d6032fa3-...`, $10,206 budget)
- Link to PO `1442c768-...`
- Update memo to "First floor balance"

**Step 2 -- Insert new bill line**
- Amount: $1,000
- Link to "Decks" PO line (`15e25b7a-...`, $2,232 budget)
- Same bill, owner, project, cost code as original
- Memo: "Deck framing draw"

### Result
- "First floor" row: $3,206 billed of $10,206 budget ($7,000 remaining)
- "Decks" row: $1,000 billed of $2,232 budget ($1,232 remaining)
- Bill total unchanged at $4,206 ($3,206 + $1,000)
- No unallocated billing on this PO

### No Code Changes Needed
The existing display logic already handles multiple bill lines and PO allocations correctly.

