

## Center the Marketplace Signup Page

### Problem
The marketplace signup form appears left-aligned because:
1. The header uses `max-w-7xl` (very wide container)
2. The main content uses `max-w-2xl` (narrower, but both use `mx-auto`)
3. On wide screens, the header content stretches across the full width while the form stays narrow and left-aligned within its container

### Solution
Restructure the layout so the entire page content is centered in the viewport, creating a cohesive centered design.

### File to Modify

**`src/pages/MarketplaceSignup.tsx`**

### Changes

1. **Update the header container** (line 201)
   - Change from `max-w-7xl mx-auto` to `max-w-2xl mx-auto`
   - This aligns the header width with the form width

2. **Add flexbox centering to the main wrapper** (line 198)
   - Add `flex flex-col` to the root div
   - This ensures proper vertical structure

3. **Update main content area** (line 218)
   - Keep the `max-w-2xl mx-auto` but ensure the content fills available space properly

### Visual Result

```text
BEFORE:
+------------------------------------------+
| Logo                     Back to Home    |  <- Header spans full width
+------------------------------------------+
| +----------------+                       |
| | Form Card      |                       |  <- Form left-aligned in 2xl container
| +----------------+                       |
+------------------------------------------+

AFTER:
+------------------------------------------+
|        +------------------------+        |
|        | Logo     Back to Home  |        |  <- Header matches form width
|        +------------------------+        |
|        +------------------------+        |
|        |     Form Card          |        |  <- Centered form
|        +------------------------+        |
+------------------------------------------+
```

### Technical Details

The fix aligns the header's max-width constraint with the main content's max-width, creating a unified centered column layout that looks balanced on all screen sizes.

