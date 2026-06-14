## Changes to `src/components/issues/AddIssueDialog.tsx`

### Remove
- **Solution Files** section (state `solutionFiles`, `setSolutionFiles`, `uploadSolutionFiles`, validation entry, JSX block).
- **Comment** section (state `comment`, `setComment`, validation entry, JSX block).
- Trailing `updateIssue.mutateAsync({ solution, solution_files })` call.
- `updateIssue` from `useIssueMutations` destructure (no longer needed).
- `Textarea` import (unused).

After cleanup, required fields are: **Title**, **Priority** (defaults Normal), **Issue Files** (≥1).

Submit flow becomes:
1. `createIssue.mutateAsync({ title, category, priority })`
2. `uploadIssueFiles(newIssue.id)`
3. Toast success, reset, close.

### Redesign Issue Files display (match `IssueFilesCell` style)
Replace the current `FileList` chip component with an icon-based row that mirrors `src/components/issues/IssueFilesCell.tsx`:

- For each pending file, render a relative-positioned wrapper with:
  - The file-type icon from `getFileIcon(file.name)` colored via `getFileIconColor(file.name)`, sized `h-5 w-5` with `p-1` padding.
  - A small red circular `×` button absolutely positioned at `-top-1 -right-1` (`bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3`) that removes that file from state.
  - `title` tooltip showing the clean filename via `getCleanFileName`.
- Layout: `flex items-center gap-1 flex-wrap` immediately under the Add Files button (no chip with filename text — icon only, matching the rest of the app).

Imports to add:
```ts
import { getFileIcon, getFileIconColor, getCleanFileName } from "@/components/bidding/utils/fileIconUtils";
```
Remove the `X` lucide import (no longer used).

No other files change. No schema/backend changes.
