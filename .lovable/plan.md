

## Plan: Restore Print Section Headers & Suppress Browser Print Metadata

### What went wrong
The previous edit removed the app's own section titles (CONTRACT SUMMARY, ARTICLES, EXHIBIT A, etc.) from the **printed output** by making `makePage` ignore them. The user wanted those kept — they only wanted the **browser-generated** date/time/title/page-number strip removed.

### What to fix

**File: `src/components/templates/SubcontractorContractForm.tsx`**

**1. Restore section headers in `makePage` (lines 289-293)**
Re-add `generatePrintHeader(subtitle)` inside `makePage` so printed pages show their section title (CONTRACT SUMMARY, ARTICLES, etc.) at the top of each page, just like the on-screen view.

Change `makePage` from:
```tsx
const makePage = (_pageNum, _subtitle, content) => `
  <div style="...">
    <div style="font-size: 11px;">${content}</div>
  </div>
`;
```
To:
```tsx
const makePage = (_pageNum, subtitle, content) => `
  <div style="...">
    ${generatePrintHeader(subtitle)}
    <div style="font-size: 11px;">${content}</div>
  </div>
`;
```

**2. Remove the custom "Page X of Y" footer (already done — no change needed)**
The footer removal from the previous edit is correct. Keep it removed.

**3. Suppress browser-generated headers/footers via CSS `@page` (lines 338-345)**
Add a `@page { margin: 0; }` rule to the print window's styles. This tells most browsers (Chrome, Edge) to hide their default date/time/URL/page-number decorations without requiring the user to manually uncheck "Headers and footers" in the print dialog.

Add to the `<style>` block inside `htmlContent`:
```css
@page { margin: 0; }
```

This works because browser print headers/footers render inside the page margin area. Setting margin to 0 eliminates that space, suppressing the browser metadata. The document already has its own padding (0.5in/0.75in) inside each page div, so content positioning is unaffected.

### Summary of changes
- One function call restored in `makePage` (~1 line)
- One CSS rule added to `@page` (~1 line)
- No other files affected

### Note for the user
The `@page { margin: 0; }` trick works in Chromium-based browsers (Chrome, Edge). In Firefox or Safari, you may still need to uncheck "Headers and footers" in the print dialog.

