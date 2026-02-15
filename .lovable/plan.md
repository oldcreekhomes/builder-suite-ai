

## Reset Fonts to shadcn/ui Defaults

### Root Cause

The app uses **Montserrat** (a Google Font) as its primary typeface and overrides Tailwind's default font sizes with custom CSS variables. shadcn/ui is designed around the default system font stack (`ui-sans-serif, system-ui, -apple-system, ...`), which is why every component -- tables, dropdowns, buttons, headings -- looks different from the shadcn examples.

### Changes

**1. Remove Montserrat font loading**
- File: `index.html`
- Remove the Google Fonts `<link>` tag that loads Montserrat

**2. Remove custom font family override**
- File: `tailwind.config.ts`
- Delete the `fontFamily.sans` override so Tailwind uses its built-in default system font stack

**3. Remove custom font size variables and overrides**
- File: `src/index.css`
- Remove the `--font-size-xs`, `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl` CSS variables
- File: `tailwind.config.ts`
- Remove the `fontSize` overrides so `text-xs`, `text-sm`, `text-base`, etc. use Tailwind's built-in defaults (which are what shadcn is designed for)

### Result

Every element in the application -- table headers, dropdown menus, buttons, inputs, labels -- will use the same font family and sizes as shadcn.com. No more visual mismatch.

### What stays the same

- All functionality unchanged
- Icon size variables (`--icon-xs`, etc.) are kept (they control icon dimensions, not fonts)
- Table sizing variables (`--table-head-h`, etc.) are kept
- All color variables untouched

