import { useNotificationPreferences } from "./useNotificationPreferences";

export const useEmployeePermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();

  const isLoading = prefsLoading;

  // While loading, deny access (secure by default)
  if (isLoading) {
    return {
      canAccessEmployees: false,
      isLoading,
    };
  }

  // Permissions are strictly driven by user preferences
  return {
    canAccessEmployees: preferences.can_access_employees ?? false,
    isLoading,
  };
};
