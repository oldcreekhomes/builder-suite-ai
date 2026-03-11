

## Plan: Add Templates Feature with Permission Gating

### Overview
Add a permission-gated "Templates" nav item directly above Marketplace, following the exact same pattern used for Marketplace (permission flag, hook, guard, sidebar visibility, employee access toggle).

### 1. Database Migration
Add `can_access_templates` boolean column to `user_notification_preferences` table, defaulting to `false`.

```sql
ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_templates boolean NOT NULL DEFAULT false;
```

### 2. New Files

**`src/hooks/useTemplatePermissions.ts`** — Clone of `useMarketplacePermissions.ts`, returns `canAccessTemplates` from preferences.

**`src/components/guards/TemplatesGuard.tsx`** — Clone of `MarketplaceGuard.tsx`, redirects unauthorized users with toast.

**`src/pages/Templates.tsx`** — Placeholder page with title "Templates" and empty state. Will be built out with the subcontractor agreement template next.

### 3. Modified Files

**`src/hooks/useNotificationPreferences.tsx`**
- Add `can_access_templates: boolean` to `NotificationPreferences` interface
- Add `can_access_templates: false` to `defaultPreferences`

**`src/components/employees/EmployeeAccessPreferences.tsx`**
- Add a "Templates" section with toggle directly above the Marketplace section (same structure)

**`src/components/sidebar/SidebarNavigation.tsx`**
- Import `useTemplatePermissions`
- Add Templates link (`/templates`, `FileText` icon) directly above the Marketplace link, gated by `canAccessTemplates`

**`src/components/sidebar/CompanyDashboardNav.tsx`**
- Import `useTemplatePermissions`
- Add Templates link directly above the Marketplace link, gated by `canAccessTemplates`

**`src/App.tsx`**
- Import `TemplatesGuard` and `Templates` page
- Add route: `/templates` wrapped in `ProtectedRoute > TemplatesGuard`

### Pattern Reference
Every step mirrors the existing Marketplace implementation exactly — same permission check flow, same guard pattern, same sidebar conditional rendering.

