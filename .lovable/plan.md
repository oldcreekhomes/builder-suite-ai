

## Investigation: Equity Partner #1 Balance Discrepancy ($4,000 vs $0)

### Root Cause Found

The **Balance Sheet is correct** ($4,000). The **detail dialog is wrong** ($0).

The difference comes from how each component filters by `project_id`:

- **Balance Sheet** (line 115): `query.eq('project_id', projectId)` — only includes journal lines explicitly assigned to this project.
- **Account Detail Dialog** (line 160): `query.or('project_id.eq.${projectId},project_id.is.null')` — includes project lines **plus** company-wide lines (where `project_id` is null).

For equity account 2905.1, there are likely company-wide journal entries (with `project_id = NULL`) that offset the project-specific entries, causing the dialog's running balance to net to $0. These null-project entries should not appear in a project-scoped detail view — the Balance Sheet correctly excludes them.

### Fix

**File: `src/components/accounting/AccountDetailDialog.tsx`** (line ~158-161)

Change the project filtering from:
```typescript
if (projectId) {
  query = query.or(`project_id.eq.${projectId},project_id.is.null`);
}
```
To match the Balance Sheet's strict filter:
```typescript
if (projectId) {
  query = query.eq('project_id', projectId);
} else {
  query = query.is('project_id', null);
}
```

This ensures the dialog only shows transactions that belong to the selected project, matching the Balance Sheet calculation exactly. Company-wide entries (null project_id) will only appear in the company-wide report view.

The same fix should also be applied to the consolidated bill payments query (~line 437-441), which already uses the correct pattern — so only the journal_entry_lines query needs updating.

