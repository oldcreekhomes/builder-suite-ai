

## Fix: Preserve Representative Data When Switching Tabs

### Problem
When switching between tabs in the "Add New Company" dialog, the representative form fields get wiped out. This happens because Radix UI Tabs unmounts the content of inactive tabs, destroying the `InlineRepresentativeForm`'s internal form state. The company info tab doesn't have this problem because its fields are managed by the parent form which stays mounted.

### Solution
Add `forceMount` to all three `TabsContent` components so they stay in the DOM when inactive, and use a CSS class to hide inactive tabs visually. This way the representative form keeps its state across tab switches.

### Changes

**File: `src/components/companies/AddCompanyDialog.tsx`**

Update the three `TabsContent` elements:
- Add `forceMount` prop to each `TabsContent`
- Add `className` with `data-[state=inactive]:hidden` to hide inactive tabs via CSS instead of unmounting them

This is a minimal, targeted change -- just 3 lines modified. No changes to the `InlineRepresentativeForm` or any other component.

