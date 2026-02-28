

## Remove "Back to Project" Button and Match Project Name Font Size

### Problem
1. The "Back to Project" button on project sub-pages (Files, Budget, Bidding, etc.) is pointless -- you're already on the project, so navigating "back to project" is redundant.
2. The project name (e.g., "1 East Custis Avenue Alexandria, VA, USA") uses `text-2xl font-bold`, which is larger than the sidebar's "BuilderSuiteML" branding (`text-xl font-bold`).

### Changes

**File: `src/components/DashboardHeader.tsx`**

In the project-specific header section (the `if (projectId)` block, lines 67-75):

1. **Remove the "Back to Project" button** -- delete the `Button` with `ArrowLeft` icon and "Back to Project" text
2. **Change project name font** from `text-2xl font-bold` to `text-xl font-bold` to match BuilderSuiteML exactly
3. Clean up the unused `ArrowLeft` import and `navigate` usage (since it was only used for "Back to Project")

The project name, edit button, and collapse trigger all remain -- just the redundant nav button goes away and the font size is standardized.

