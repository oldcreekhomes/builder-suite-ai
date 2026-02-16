

## Allocate INV0010 to "2nd Floor" PO Line

### The Problem
The bill line for INV0010 ($7,000) has `purchase_order_id` set to the correct PO, but `purchase_order_line_id` is NULL. That is why it shows as "Unallocated" instead of appearing on the "2nd floor" row.

### The Fix
This is a one-line database update -- set `purchase_order_line_id` on the bill line to point to the "2nd floor" PO line.

| Field | Current Value | New Value |
|-------|--------------|-----------|
| `bill_lines.purchase_order_line_id` | NULL | `202c5f27-2c15-48f5-924f-9e1da3934414` (2nd floor, $11,008) |

Bill line ID: `3683d0d0-b56f-425e-ba4c-c3ff60bb5d41`

### SQL to Execute

```sql
UPDATE bill_lines
SET purchase_order_line_id = '202c5f27-2c15-48f5-924f-9e1da3934414'
WHERE id = '3683d0d0-b56f-425e-ba4c-c3ff60bb5d41';
```

### Result After Fix
- "2nd floor" row: PO Amount $11,008.00 | Billed $7,000.00 | Remaining $4,008.00
- "Unallocated" row disappears (no more unallocated billing)
- All other lines remain at $0.00 billed
- Header totals unchanged: Billed to Date $7,000.00 | Remaining $35,343.00

### No Code Changes Needed
The display logic already handles explicit `purchase_order_line_id` links correctly. This is purely a data fix.

