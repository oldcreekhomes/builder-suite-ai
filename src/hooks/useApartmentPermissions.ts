import { useNotificationPreferences } from "./useNotificationPreferences";
import { useCompanyFeatures } from "./useCompanyFeatures";

export const useApartmentPermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { features, isLoading: featuresLoading } = useCompanyFeatures();

  const userCan = (preferences as any)?.can_access_apartments ?? false;

  return {
    canAccessApartments: userCan && features.apartments,
    isLoading: prefsLoading || featuresLoading,
  };
};
