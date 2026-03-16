

## Plan: Dynamic Article 3 — CONTRACT SUM with live total

**Problem**: Article 3's body is static boilerplate text that says "the amounts stated in the Subcontract Summary." It should display the actual computed contract total (e.g., "$940,126.00") and update live when line items change.

**Solution**: In `SubcontractorContractForm.tsx`, dynamically inject the `contractTotal` value into Article 3's body text at render time — both on-screen and in the print output.

### Changes — single file: `src/components/templates/SubcontractorContractForm.tsx`

1. **Create a helper** that takes the articles array and returns a new array where Article 3's body includes the formatted `contractTotal`. For example, replace the generic phrase with: *"The Contractor agrees to pay the Subcontractor **$940,126.00** for full performance of the Work..."*

2. **On-screen rendering** (~line 516): Pass the enriched articles to `renderArticles()` instead of raw `articles`.

3. **Print rendering** (~line 283): Pass the enriched articles to `generatePrintArticles()` so the printed PDF also reflects the live total.

The default Article 3 body text (in `useTemplateContent.ts`) stays as-is — the dynamic value is injected at display time only, using a placeholder or string replacement approach (e.g., replace "the amounts stated in the Subcontract Summary" with the actual dollar figure, or always rebuild the sentence with `contractTotal`).

