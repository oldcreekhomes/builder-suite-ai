

## Redesign Onboarding Checklist: Two-Column Layout with Prominent Buttons

### Changes

**File: `src/components/OnboardingChecklist.tsx`**

1. **Two-column grid layout** -- Split the 7 checklist items into two columns (4 on the left, 3 on the right) using a CSS grid, cutting the vertical height roughly in half.

2. **Replace text "Go" links with actual buttons** -- Swap the current plain text link for a small, styled `Button` component (using the existing `outline` or `default` variant at `sm` size) so it stands out clearly as an actionable element.

### Visual Result

```text
+------------------------------------------------------------------+
|  Get Started with BuilderSuite                           1 of 7  |
|  ==================----------------------------          (14%)   |
|                                                                  |
|  Left Column                        Right Column                 |
|  [x] Verify Email                   [ ] Add Subcontractors [Go]  |
|  [ ] Set Up Company Profile  [Go]   [ ] Create First Project[Go] |
|  [ ] Import Cost Codes       [Go]   [ ] Invite Employees   [Go]  |
|  [ ] Import Chart of Accounts[Go]                                |
+------------------------------------------------------------------+
```

### Technical Details

- Use `grid grid-cols-1 md:grid-cols-2 gap-2` to create the two-column layout
- Split steps array: `steps.slice(0, 4)` for left, `steps.slice(4)` for right
- Replace the `<button>` text link with `<Button variant="outline" size="sm">` from the existing UI library
- Keep all existing logic (auto-hide, progress bar, navigation) unchanged
