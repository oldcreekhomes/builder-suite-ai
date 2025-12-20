import { useNotificationPreferences } from "./useNotificationPreferences";

export const useEstimatePermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canAccessEstimate: preferences?.can_access_estimate ?? false,
    isLoading,
  };
};
