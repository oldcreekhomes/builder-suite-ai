import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useAccountingPermissions = () => {
  const { isOwner, isLoading: rolesLoading } = useUserRole();
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();

  const isLoading = rolesLoading || prefsLoading;

  // While loading, deny access (secure by default)
  if (isLoading) {
    return {
      canAccessAccounting: false,
      canAccessManageBills: false,
      canAccessTransactions: false,
      canAccessReports: false,
      isLoading,
    };
  }

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

  // For non-owners, use their preference settings (default to false if not set)
  return {
    canAccessAccounting: preferences.can_access_accounting ?? false,
    canAccessManageBills: preferences.can_access_manage_bills ?? false,
    canAccessTransactions: preferences.can_access_transactions ?? false,
    canAccessReports: preferences.can_access_reports ?? false,
    isLoading,
  };
};
