

## Remove "Profile" from Sidebar Dropdown Menu

### Overview
Remove the "Profile" menu item from the lower-left user dropdown since it now lives under Settings > My Profile. The dropdown will only show "Settings" and "Log out".

### Change

**`src/components/sidebar/SidebarUserDropdown.tsx`**
- Remove the "Profile" `DropdownMenuItem` (the one navigating to `/settings?tab=my-profile`)
- Remove the `User` icon import from lucide-react (no longer needed)
- Keep only "Settings" and "Log out" menu items

### Result
The dropdown menu will show:
1. Settings
2. ---separator---
3. Log out

