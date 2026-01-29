
## Single-Line Bank Register Rows with Truncation and Tooltips

### Problem
The bank register table has rows spanning multiple lines because the Name, Account, and Description columns allow text to wrap. This looks messy and makes the table hard to scan.

### Solution
Add fixed column widths with text truncation (`truncate` class) and tooltips on hover to show full text. All rows will be exactly one line tall.

### Changes to AccountDetailDialog.tsx

**1. Update Table Headers (lines 1096-1104)**
Add fixed widths to control column sizing:

| Column | Width | Reason |
|--------|-------|--------|
| Type | w-28 | Fixed for "Bill Pmt - Check" |
| Date | w-24 | Fixed for date format |
| Name | w-32 | Truncate with tooltip |
| Account | w-36 | Truncate with tooltip |
| Description | w-40 | Truncate with tooltip |
| Amount | w-24 | Right-aligned numbers |
| Balance | w-24 | Right-aligned numbers |
| Cleared | w-16 | Centered checkmark |
| Actions | w-16 | Centered icons |

**2. Name Column (lines 1149-1156)**
Wrap the `AccountTransactionInlineEditor` in a truncating container with tooltip:

```tsx
<TableCell className="px-2 py-1 max-w-[120px]">
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="truncate">
        <AccountTransactionInlineEditor
          value={txn.reference || '-'}
          field="reference"
          ...
        />
      </div>
    </TooltipTrigger>
    <TooltipContent>{txn.reference || '-'}</TooltipContent>
  </Tooltip>
</TableCell>
```

**3. Account Column (lines 1157-1185)**
Add truncation to both consolidated and regular displays:

```tsx
<TableCell className="px-2 py-1 max-w-[140px]">
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="text-xs truncate block">
        {txn.accountDisplay || '-'}
      </span>
    </TooltipTrigger>
    <TooltipContent>{txn.accountDisplay || '-'}</TooltipContent>
  </Tooltip>
</TableCell>
```

**4. Description Column (lines 1187-1194)**
Wrap the `AccountTransactionInlineEditor` with truncation and tooltip:

```tsx
<TableCell className="px-2 py-1 max-w-[160px]">
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="truncate">
        <AccountTransactionInlineEditor
          value={txn.description || '-'}
          field="description"
          ...
        />
      </div>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      {txn.description || '-'}
    </TooltipContent>
  </Tooltip>
</TableCell>
```

**5. Ensure single-line row height**
Add `whitespace-nowrap` to TableRow and ensure all text uses truncation

### Files to Modify
| File | Change |
|------|--------|
| `src/components/accounting/AccountDetailDialog.tsx` | Add column widths, truncation, and tooltips |

### Result After Implementation
- All rows display on exactly one line
- "Old Creek Homes, LLC" shows as "Old Creek Ho..." with full name on hover
- "2440 - Land Carrying Costs" shows as "2440 - Land Ca..." with full text on hover
- "Backfilled consolidated payment - 2 bills" shows truncated with full text on hover
- Clean, scannable table that matches professional accounting software
