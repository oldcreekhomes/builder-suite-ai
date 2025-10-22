import { useNotificationPreferences } from "./useNotificationPreferences";

export const useAccountingPermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();

  const isLoading = prefsLoading;

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

  // Permissions are strictly driven by user preferences
  return {
    canAccessAccounting: preferences.can_access_accounting ?? false,
    canAccessManageBills: preferences.can_access_manage_bills ?? false,
    canAccessTransactions: preferences.can_access_transactions ?? false,
    canAccessReports: preferences.can_access_reports ?? false,
    isLoading,
  };
};
