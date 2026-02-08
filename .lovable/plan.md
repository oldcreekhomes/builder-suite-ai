
# Fix: Hide Marketplace on Company Dashboard When No Permission

## Problem

The Marketplace menu shows on the main company dashboard because there are **two separate components** rendering the sidebar navigation:

1. `SidebarNavigation.tsx` - Used on project pages (already has permission check)
2. `CompanyDashboardNav.tsx` - Used on company dashboard (missing permission check)

The `CompanyDashboardNav.tsx` component at lines 21-30 shows the Marketplace link **without checking permissions**.

## Solution

Update `CompanyDashboardNav.tsx` to:
1. Import and use the `useMarketplacePermissions` hook
2. Conditionally render the Marketplace link only when `canAccessMarketplace` is true

## Code Changes

### File: `src/components/sidebar/CompanyDashboardNav.tsx`

```typescript
import { AlertTriangle, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useIssueCounts } from "@/hooks/useIssueCounts";
import { useMarketplacePermissions } from "@/hooks/useMarketplacePermissions";

export function CompanyDashboardNav() {
  const { data: issueCounts } = useIssueCounts();
  const { canAccessMarketplace, isLoading: marketplaceLoading } = useMarketplacePermissions();
  
  // ... existing issue counts logic ...

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-1">
        {/* Marketplace Link - only show if user has permission */}
        {!marketplaceLoading && canAccessMarketplace && (
          <div>
            <Link 
              to="/marketplace" 
              className="flex items-center space-x-2 px-2 py-2 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
            >
              <Store className="h-4 w-4" />
              <span className="flex-1">Marketplace</span>
            </Link>
          </div>
        )}

        {/* Software Issues Section ... */}
      </div>
    </div>
  );
}
```

## Summary

| File | Change |
|------|--------|
| `src/components/sidebar/CompanyDashboardNav.tsx` | Add permission check for Marketplace link |

This will immediately hide the Marketplace link on the company dashboard when the user doesn't have access, and the realtime subscription we added earlier will ensure it updates immediately when permissions change.
