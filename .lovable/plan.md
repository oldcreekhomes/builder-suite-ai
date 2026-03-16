

## Plan: Bold SOW Section Headers in Print Output

### Problem
The Scope of Work section headers (A. General Conditions/Mobilization, B. Erosion Control, etc.) appear as plain text in the printed output. They should be bold.

### Approach
The SOW is stored as plain text in a `<Textarea>` (which can't render bold), so this change targets the **print output only**. In the `handlePrint` function, when rendering each scope chunk, apply a regex replacement to wrap lines matching `^[A-Z]\. ` with `<strong>` tags.

### File: `src/components/templates/SubcontractorContractForm.tsx` (~line 423)

Replace the plain text rendering:
```js
const content = `<div style="white-space: pre-line;">${chunk}</div>`;
```

With a version that bolds section headers:
```js
const boldedChunk = chunk.replace(/^([A-Z]\.\s.+)$/gm, '<strong>$1</strong>');
const content = `<div style="white-space: pre-line;">${boldedChunk}</div>`;
```

This regex matches any line starting with a capital letter followed by `. ` (e.g., "A. General Conditions/Mobilization") and wraps the entire line in `<strong>` tags. Sub-items (numbered lines like "1. Project mobilization...") are unaffected.

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx` (line 423)

