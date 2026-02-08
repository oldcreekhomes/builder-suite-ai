

# Move Marketplace Below Accounting in Sidebar

## Current Problem

The Marketplace menu item is currently positioned in the `navigationItems` array and gets rendered **before** the Accounting section. The render order is:

1. Company Dashboard
2. Files
3. Photos
4. Estimate
5. Budget
6. Bidding
7. Purchase Orders
8. Schedule
9. **Marketplace** (currently here)
10. Accounting (rendered separately below the loop)
11. Software Issues

## Solution

Remove Marketplace from the `navigationItems` array and render it separately **after** the Accounting section (and its submenu items).

## Changes Required

### File: `src/components/sidebar/SidebarNavigation.tsx`

1. **Remove Marketplace from `navigationItems` array** (lines 94-100)
   - Delete the Marketplace entry from the array

2. **Add Marketplace link after Accounting section** (after line 257)
   - Add a new Link component for Marketplace
   - Position it immediately after the Accounting submenu items
   - Keep it as a global route (not prefixed with project ID)

### New Sidebar Order (for project pages)

1. Company Dashboard
2. Files
3. Photos
4. Estimate
5. Budget
6. Bidding
7. Purchase Orders
8. Schedule
9. Accounting (with submenu)
10. **Marketplace** (moved here)
11. Software Issues

## Code Changes

```typescript
// Remove from navigationItems array (delete lines 94-100)

// Add after the Accounting section closing div (after line 257):
{/* Marketplace - Global link, shown for all users */}
<Link
  to="/marketplace"
  className="flex items-center space-x-2 px-2 py-1.5 rounded-lg w-full hover:bg-gray-100 text-gray-700 hover:text-black transition-colors text-sm"
>
  <Store className="h-4 w-4" />
  <span className="flex-1">Marketplace</span>
</Link>
```

## Additional Note

The `CompanyDashboardNav.tsx` file already has Marketplace positioned correctly for the Company Dashboard view, so no changes are needed there.

