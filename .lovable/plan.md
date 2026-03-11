

## Plan: Add "Edit Templates" Permission & Editable Template Content

### Overview
Add a new `can_edit_templates` permission (separate from `can_access_templates`) that controls whether a user can modify the template's boilerplate content (article text, exhibits defaults, etc.). Default: off for everyone. Matt Cray will be enabled via a migration.

### 1. Database Migration
- Add `can_edit_templates boolean NOT NULL DEFAULT false` to `user_notification_preferences`
- Find Matt Cray's user ID and set his `can_edit_templates` to `true`

### 2. Update Permission Infrastructure
- **`useNotificationPreferences.tsx`**: Add `can_edit_templates` to interface and defaults (false for all, including owners)
- **`useTemplatePermissions.ts`**: Also return `canEditTemplates` from preferences
- **`EmployeeAccessPreferences.tsx`**: Add "Edit Templates" toggle under the Templates section, below "Access Templates"

### 3. Editable Template Card
- **`TemplateCard.tsx`**: Accept an optional `onEdit` prop. When provided, show a pencil/edit icon button in the card header row (to the right of the title). Clicking it navigates to an edit route (e.g., `/templates/subcontractor-contract/edit`).
- **`Templates.tsx`**: Pass `onEdit` only when `canEditTemplates` is true.

### 4. Template Edit Page
- **New file: `src/pages/templates/SubcontractorContractEdit.tsx`**: A page where the user can edit the boilerplate article text. For now, since templates are hardcoded, this will store customized article text in `localStorage` (or a new Supabase table if preferred). The form will show all 14 articles as editable textareas, plus the default exhibit text, with a Save button.
- **`SubcontractorContractForm.tsx`**: Load saved article text from storage, falling back to hardcoded defaults.

### 5. Routing
- **`App.tsx`**: Add route `/templates/subcontractor-contract/edit` wrapped in `ProtectedRoute > TemplatesGuard` (the guard already checks access; the edit page will additionally check `canEditTemplates`).

### Question for You

Before I finalize — where should the edited template content be saved?

