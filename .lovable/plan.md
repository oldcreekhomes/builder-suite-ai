

## Plan: Autosave contract form fields and line items

### Problem
All form fields (contract info, scope of work, line items) exist only in React `useState` with hardcoded defaults. Navigating away loses everything. Your edits cannot be recovered — they only existed in browser memory.

### Solution: Debounced autosave using existing infrastructure

The `useTemplateContent` hook already saves/loads JSON to the `template_content` table. We'll create a **second instance** of this pattern for form field data, with a 2-second debounced autosave.

**No database changes needed** — the existing `template_content` table supports any `template_key`.

### Changes

**1. Create `src/hooks/useContractFormData.ts`** — New hook that:
- Loads saved `fields` and `lineItems` from `template_content` with key `"subcontractor-contract-form-data"`
- Provides a `save()` function (same upsert pattern as `useTemplateContent`)
- Returns loaded data or `null` if nothing saved yet

**2. Update `src/components/templates/SubcontractorContractForm.tsx`**:
- Import and call `useContractFormData`
- Initialize `fields` and `lineItems` from loaded data (fall back to current hardcoded defaults)
- Add a `useEffect` that debounces saves: whenever `fields` or `lineItems` change, reset a 2-second timer, then upsert the JSON
- Show a small "Saving..." / "Saved" text indicator near the page navigation so the user knows their work is persisted
- Skip the initial render (don't save defaults on first load)

### Autosave flow
```text
User types → setState → useEffect fires → 2s timer resets → timer fires → upsert to template_content
```

### Data stored (single JSON row, ~5KB max)
```json
{
  "fields": { "contractorName": "...", "scopeOfWork": "...", ... },
  "lineItems": [{ "letter": "A", "description": "...", "amount": 19653 }, ...]
}
```

### Cost
One `upsert` of ~5KB every 2 seconds of active typing. Completely negligible — less than a chat message. No performance or billing concern.

### Files to create/edit
- **Create**: `src/hooks/useContractFormData.ts`
- **Edit**: `src/components/templates/SubcontractorContractForm.tsx`

