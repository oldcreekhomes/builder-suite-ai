

## Move Profile to Settings Page as "My Profile"

### Overview
Move the profile editing UI (avatar, name, email, phone) from the popup dialog into the Settings page as a new "My Profile" tab. The tab will be placed in alphabetical order between "Dashboards" and "Employees". The sidebar dropdown "Profile" option will navigate to `/settings?tab=my-profile` instead of opening a dialog.

### Changes

**1. New file: `src/components/settings/MyProfileTab.tsx`**
- Extract the profile form (avatar upload, first/last name, email, phone, save button) from `ProfileDialog.tsx` into a standalone settings tab component
- Follow the same layout pattern as other settings tabs: header with title (h3) and subtitle, then the form content in a Card
- Reuse the same hooks (`useAuth`, `useUserProfile`) and Supabase logic

**2. `src/pages/Settings.tsx`**
- Import and add `MyProfileTab`
- Add a new `TabsTrigger` for "My Profile" between "Dashboards" (line 170) and "Employees" (line 171)
- Add a corresponding `TabsContent` for the `my-profile` value

**3. `src/components/sidebar/SidebarUserDropdown.tsx`**
- Change the "Profile" dropdown item from opening the dialog (`setProfileOpen(true)`) to navigating: `navigate('/settings?tab=my-profile')`
- Remove the `ProfileDialog` import and usage
- Remove the `profileOpen` state

**4. `src/components/ProfileDialog.tsx`**
- Keep the file for now (in case it's referenced elsewhere), but it will no longer be actively used from the sidebar

### Alphabetical Order (updated)
1. Budget
2. Chart of Accounts
3. Company Profile
4. Cost Codes
5. Dashboards
6. **My Profile** (new)
7. Employees
8. Specifications
9. Suppliers (Companies, Representatives)

