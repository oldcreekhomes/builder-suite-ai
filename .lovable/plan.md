

# Fix: Marketplace Menu Not Hiding When Access Revoked

The Marketplace menu item still appears after you disable your access because the sidebar component isn't getting the updated permission data in real-time.

## Root Cause

When you toggle the Marketplace permission in Employee Access settings:
1. The database updates correctly (verified: `can_access_marketplace: false`)
2. React Query invalidates the cache for that specific user
3. But the sidebar doesn't automatically refetch or re-render with the new value

This same issue could affect other permission toggles, but the pattern hasn't been consistently applied.

## Solution

Add a Supabase realtime subscription to `useNotificationPreferences` that listens for changes to the current user's preferences and automatically refetches the data. This follows the existing pattern mentioned in project memory for "realtime-permissions-updates-supabase-subscription".

## Changes Required

### 1. Update `src/hooks/useNotificationPreferences.tsx`

Add realtime subscription to detect preference changes:

```typescript
import { useEffect } from "react";

// Inside useNotificationPreferences hook, add after the useQuery:

useEffect(() => {
  if (!targetUserId) return;

  const channel = supabase
    .channel(`preferences-${targetUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_notification_preferences',
        filter: `user_id=eq.${targetUserId}`,
      },
      () => {
        // Refetch preferences when database changes
        queryClient.invalidateQueries({ 
          queryKey: ['notification-preferences', targetUserId] 
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [targetUserId, queryClient]);
```

### 2. (Optional) Add optional chaining for safety

Update `useMarketplacePermissions.ts` to match `useEstimatePermissions.ts`:

```typescript
canAccessMarketplace: preferences?.can_access_marketplace ?? false,
```

## How This Fixes the Issue

| Before | After |
|--------|-------|
| Toggle permission OFF in settings | Toggle permission OFF in settings |
| Database updates | Database updates |
| React Query cache invalidated for that userId | Realtime subscription detects change |
| Sidebar doesn't know to refetch | `invalidateQueries` triggers refetch |
| Menu still visible | Menu disappears immediately |

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useNotificationPreferences.tsx` | Add Supabase realtime subscription |
| `src/hooks/useMarketplacePermissions.ts` | Add optional chaining (minor) |

## Testing

After implementation:
1. Navigate to Employee Access settings for your own user
2. Toggle Marketplace access OFF
3. The Marketplace menu item should disappear immediately without page refresh

