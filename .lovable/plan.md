

# Rebrand: BuilderSuite AI to BuilderSuite with Stylized ML Symbol

## Concept

Replace "BuilderSuite AI" with "BuilderSuite" followed by a small superscript "ML" styled like a trademark symbol (similar to how (TM) appears next to brand names, but with "ML" for Machine Learning). This gives a clean, professional look while highlighting the machine learning aspect.

## Visual Example

```text
BuilderSuite^ML   (where ^ML is a small superscript like the TM symbol)
```

## Changes

### 1. Sidebar Branding (top-left of the app)
**File:** `src/components/sidebar/SidebarBranding.tsx`

- Change "BuilderSuite AI" text to "BuilderSuite" with a styled superscript `<sup>` element containing "ML"
- Style the "ML" with a small font size, slight vertical offset, and optionally a subtle circle/border to mimic the trademark look

### 2. Public Header (marketing pages)
**File:** `src/components/PublicHeader.tsx`

- Update the logo text from "BuilderSuite" to include the ML superscript styling

### 3. Public Footer
**File:** `src/components/PublicFooter.tsx`

- Same ML superscript treatment

### 4. Page Title and Meta Tags
**File:** `index.html`

- Update `<title>` from "BuilderSuite AI" to "BuilderSuite ML"
- Update all Open Graph and Twitter meta tags

### 5. Other UI References (17 files total)
These files contain "BuilderSuite AI" in various places (welcome messages, email templates, toast notifications, etc.) and will be updated to use "BuilderSuite" with the appropriate ML notation:

- `src/pages/PasswordReset.tsx` - Welcome text
- `src/components/auth/SignupForm.tsx` - Auth messaging
- `src/pages/Landing.tsx` - Marketing copy
- `supabase/functions/send-password-reset/index.ts` - Email templates
- `supabase/functions/send-signup-emails/index.ts` - Email templates
- Other files with "BuilderSuite AI" references

### Styling Approach

The ML superscript in React components will look like:

```tsx
<h1 className="text-xl font-bold text-black">
  BuilderSuite<sup className="text-[0.5em] font-bold ml-0.5 align-super border border-current rounded-full px-0.5">ML</sup>
</h1>
```

This creates the trademark-circle effect with:
- Small font size (half the parent)
- A rounded border creating the "circle" effect around "ML"
- Proper superscript alignment
- Slight padding for breathing room

For plain text contexts (emails, meta tags), it will simply read "BuilderSuite ML".

