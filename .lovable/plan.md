
## Issue Resolved Email - Label Updates

I'll update the issue closure email template with the following changes:

### Changes to Make

| Current Label | New Label | Styling |
|---------------|-----------|---------|
| Title: | Issue: | No change (black text) |
| Comment: | Solution: | Add red color (`#dc2626`) to match "Solution Files:" |

### File to Update

**`supabase/functions/send-issue-closure-email/index.ts`**

### Implementation Details

**Line 135** - Change "Title:" to "Issue:"
```html
<td style="...">Issue:</td>
```

**Lines 71-75** - Update the `commentRowHtml` variable:
- Change "Comment:" to "Solution:"
- Add `color: #dc2626;` to the label cell styling

```typescript
const commentRowHtml = solutionMessage && solutionMessage.trim().length > 0 
  ? `<tr>
       <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #dc2626;">Solution:</td>
       <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">${solutionMessage}</td>
     </tr>`
  : '';
```

### Visual Result

After the changes, the Issue Details table will display:
- **Issue:** (was Title:)
- **Category:**
- **Solution Files:** (red text - unchanged)
- **Solution:** (red text - was Comment:)
- **Date Resolved:**

Both "Solution Files:" and "Solution:" will have matching red styling for visual consistency.
