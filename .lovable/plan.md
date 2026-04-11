

## Plan: Clean Up Remaining buildersuiteai References

### Changes

1. **`supabase/functions/send-issue-closure-email/index.ts`** — Change display text `WWW.BUILDERSUITEAI.COM` to `WWW.BUILDERSUITEML.COM` on line 161. Redeploy the function.

2. **`supabase/functions/get-weather-forecast/index.ts`** — Update User-Agent from `BuilderSuiteAI Weather App` to `BuilderSuiteML Weather App` (2 occurrences). Redeploy the function.

3. **`index.html`** — The logo filename `buildersuiteai-logo.png` is a local asset path, not a domain reference. We can either rename the file to `buildersuiteml-logo.png` and update the references, or leave it as-is since users never see it. I'll rename it for consistency.

### Technical Details
- 3 files edited, 2 edge functions redeployed
- No logic changes, purely cosmetic/branding cleanup

