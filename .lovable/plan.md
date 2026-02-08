

# Add Marketplace Permission to Employee Access

Simple approach: Add `can_access_marketplace` permission that is **disabled by default for ALL users**. Admins can enable it per-employee as needed.

## Overview

| Component | Change |
|-----------|--------|
| Database | Add `can_access_marketplace` boolean column (default: `false`) |
| Hook | Add to `useNotificationPreferences.tsx` interface and defaults |
| Permission Hook | Create `useMarketplacePermissions.ts` |
| Guard | Create `MarketplaceGuard.tsx` |
| Sidebar | Conditionally show Marketplace link based on permission |
| Employee Access UI | Add "Marketplace" section with toggle |
| Route | Wrap `/marketplace` with guard |

## Database Changes

```sql
ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_marketplace boolean NOT NULL DEFAULT false;
```

That's it - no special logic for owners or any user type. Everyone starts with `false`.

## Files to Create

### 1. `src/hooks/useMarketplacePermissions.ts`

```typescript
import { useNotificationPreferences } from "./useNotificationPreferences";

export const useMarketplacePermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canAccessMarketplace: preferences.can_access_marketplace ?? false,
    isLoading,
  };
};
```

### 2. `src/components/guards/MarketplaceGuard.tsx`

Standard guard following existing pattern - redirects to `/` with toast if no permission.

## Files to Modify

### 1. `src/hooks/useNotificationPreferences.tsx`
- Add `can_access_marketplace: boolean` to interface
- Add `can_access_marketplace: false` to `defaultPreferences`

### 2. `src/components/sidebar/SidebarNavigation.tsx`
- Import `useMarketplacePermissions`
- Only show Marketplace link if `canAccessMarketplace` is true

### 3. `src/components/employees/EmployeeAccessPreferences.tsx`
- Add "Marketplace" section with toggle for `can_access_marketplace`

### 4. `src/App.tsx`
- Wrap `/marketplace` route with `MarketplaceGuard`

## Default Behavior

| All Users | Default Access |
|-----------|----------------|
| Everyone | Disabled |

Admins enable access per-employee through Employee Access settings.

