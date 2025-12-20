import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useEstimatePermissions = () => {
  const { preferences, isLoading: preferencesLoading } = useNotificationPreferences();
  const { isOwner, isLoading: roleLoading } = useUserRole();

  const isLoading = preferencesLoading || roleLoading;

  // Owners always have access to estimates
  if (isOwner) {
    return {
      canAccessEstimate: true,
      isLoading,
    };
  }

  return {
    canAccessEstimate: preferences?.can_access_estimate ?? false,
    isLoading,
  };
};
