

## Swap Column Order: Cost Code First, Description Second

### Change

**File: `src/components/bills/PODetailsDialog.tsx`**

Swap the order of the first two columns in the line items table so **Cost Code** appears first and **Description** appears second. This matches the layout shown in the screenshot.

1. **Header row** (lines 167-168): Move the "Cost Code" `TableHead` before "Description"
2. **Body rows** (lines 189-194): Move the Cost Code `TableCell` before the Description `TableCell`

No other columns, styling, or logic changes needed.

