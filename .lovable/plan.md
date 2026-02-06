

# Fix: Update Database Category Values

## Problem

The database still contains `category = "Orders"` for 2 issues, but the UI expects `category = "Purchase Orders"`:

| Current DB Category | Count | UI Expects |
|---------------------|-------|------------|
| Accounting | 1 | Accounting |
| Bidding | 4 | Bidding |
| **Orders** | **2** | **Purchase Orders** |
| **Total** | **7** | (but only 5 match) |

## Solution

Run this SQL command to update the database:

```sql
UPDATE company_issues 
SET category = 'Purchase Orders' 
WHERE category = 'Orders';
```

## How to Apply

You need to run this SQL in your Supabase dashboard:

1. Go to **Cloud View** (bottom of preview panel)
2. Select **Run SQL** 
3. Make sure **Test** environment is selected
4. Paste and run the SQL above
5. Refresh the Issues page

## Result After Fix

| Category | Count |
|----------|-------|
| Accounting | 1 |
| Bidding | 4 |
| **Purchase Orders** | **2** |
| **Total** | **7** |

Both the sidebar (7) and Issues page categories (1 + 4 + 2 = 7) will match.

## Why This Happened

The code fix I made earlier updated `AddIssueRow.tsx` to use "Purchase Orders" for **new** issues, but the 2 **existing** issues in the database still had the old "Orders" value. The database needs to be updated to match the UI labels.

