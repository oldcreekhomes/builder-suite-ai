

## Update Logo Text

Update `src/components/Logo.tsx` to simplify the logo:

1. Remove the `Building2` icon entirely
2. Remove the circled "ML" subscript
3. Replace with plain text: **BuilderSuiteML** (one word, no icon, no badge)
4. Keep the `<Link to="/">` wrapper and existing className support

The final render will just be styled text "BuilderSuiteML" that links to home.

