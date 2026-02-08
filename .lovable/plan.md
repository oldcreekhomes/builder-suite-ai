

# Consolidate Marketplace Signup Form

## Problem
The Marketplace Signup form requires scrolling and looks much more spread out compared to the compact Home Builder signup form. Key issues:
- Uses `space-y-6` (24px) between elements instead of `space-y-4` (16px)
- Has horizontal dividers (`<hr>`) with large margins (`my-6`)
- Section headers ("Primary Contact", "Login Credentials") with extra margin (`mb-4`)
- Large spacing within sections

## Solution
Make the form more compact by:
1. Reducing form spacing from `space-y-6` to `space-y-4`
2. Removing the `<hr>` dividers entirely
3. Removing section headers ("Primary Contact", "Login Credentials")
4. Reducing internal spacing within grouped fields

## Changes to `src/pages/MarketplaceSignup.tsx`

### Layout Changes

| Element | Current | New |
|---------|---------|-----|
| Form spacing | `space-y-6` | `space-y-4` |
| Individual field spacing | `space-y-2` | `space-y-2` (keep) |
| Section dividers | `<hr className="my-6" />` | Remove entirely |
| "Primary Contact" header | `<h3 className="font-medium mb-4">` | Remove entirely |
| "Login Credentials" header | `<h3 className="font-medium mb-4">` | Remove entirely |
| Inner section `space-y-4` | Keep in some places | Reduce to `space-y-3` |

### Visual Result
- All form fields flow in a single continuous list
- Reduced vertical spacing throughout
- Form will fit on screen without scrolling (or minimal scrolling)
- Maintains all required fields but in a more compact format

### Fields Retained (in order)
1. Company Type (select)
2. Company Name (input)
3. Phone Number + Website (side-by-side)
4. First Name + Last Name (side-by-side)
5. Email Address (input)
6. Password + Confirm Password (side-by-side)
7. Terms checkbox
8. Submit button
9. "Already have an account?" link

