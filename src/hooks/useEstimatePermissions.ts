import { useNotificationPreferences } from "./useNotificationPreferences";
import { useCompanyFeatures } from "./useCompanyFeatures";

export const useEstimatePermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { features, isLoading: featuresLoading } = useCompanyFeatures();

  const userCan = preferences?.can_access_estimate ?? false;

  return {
    canAccessEstimate: userCan && features.estimating,
    isLoading: prefsLoading || featuresLoading,
  };
};
