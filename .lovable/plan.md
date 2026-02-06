

# Fix: Sync Database Category Values with UI Labels

## Problem

The sidebar shows **7 issues** but the Issues page shows only **5**. The mismatch is caused by:
- 2 issues in the database have `category = "Orders"`
- The UI expects `category = "Purchase Orders"`

You want the database values to match exactly what the UI displays.

## Solution

Two changes are needed:

### 1. Database Update (One-Time Fix)

Update the 2 existing issues to use "Purchase Orders" as the category:

```sql
UPDATE company_issues 
SET category = 'Purchase Orders' 
WHERE category = 'Orders';
```

This will change:
- "Create a printable PDF PO..." → category: "Purchase Orders"
- "Discuss the ability to edit a PO..." → category: "Purchase Orders"

### 2. Code Fix - AddIssueRow.tsx (Prevents Future Issues)

The location dropdown in `AddIssueRow.tsx` uses lowercase values like `"orders"`. While this is for the `location` field (not category), it should be consistent with the category naming. Update the Select items to use proper capitalized values matching the category names:

**File:** `src/components/issues/AddIssueRow.tsx` (lines 184-195)

Change from:
```typescript
<SelectItem value="accounting">Accounting</SelectItem>
<SelectItem value="orders">Purchase Orders</SelectItem>
// ... etc
```

To:
```typescript
<SelectItem value="Accounting">Accounting</SelectItem>
<SelectItem value="Purchase Orders">Purchase Orders</SelectItem>
// ... etc
```

## Result

After these changes:
- Database will have `category = "Purchase Orders"` for all PO-related issues
- Sidebar will show **7** issues
- Issues page will show **7** issues (Accounting: 1, Bidding: 4, Purchase Orders: 2)
- All new issues will use consistent capitalized category/location values
- No more mismatches between code labels and database values

