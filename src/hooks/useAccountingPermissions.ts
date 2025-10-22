import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useAccountingPermissions = () => {
  const { isOwner, isLoading: rolesLoading } = useUserRole();
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();

  const isLoading = rolesLoading || prefsLoading;

  // Owners always have full access
  if (isOwner) {
    return {
      canAccessAccounting: true,
      canAccessManageBills: true,
      canAccessTransactions: true,
      canAccessReports: true,
      isLoading,
    };
  }

  // For non-owners, use their preference settings
  return {
    canAccessAccounting: preferences.can_access_accounting ?? true,
    canAccessManageBills: preferences.can_access_manage_bills ?? true,
    canAccessTransactions: preferences.can_access_transactions ?? true,
    canAccessReports: preferences.can_access_reports ?? true,
    isLoading,
  };
};
