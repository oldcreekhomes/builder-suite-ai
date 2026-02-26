

## Fix: Edit Deposit Navigation 404

### Root Cause

The `handleEditDeposit` function navigates to:
`/project/${projectId}/accounting/banking?tab=make-deposits&depositId=...`

But there is no route for `/project/:projectId/accounting/banking`. The correct route is:
`/project/:projectId/accounting/banking/make-deposits`

### Fix

**File: `src/components/reports/JobCostActualDialog.tsx` (line 327)**

Change the navigation URL from:
```typescript
navigate(`/project/${projectId}/accounting/banking?tab=make-deposits&depositId=${depositId}`);
```
To:
```typescript
navigate(`/project/${projectId}/accounting/banking/make-deposits?depositId=${depositId}`);
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/reports/JobCostActualDialog.tsx` | Fix navigation URL to use correct route path |

