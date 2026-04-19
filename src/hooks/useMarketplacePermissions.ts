import { useNotificationPreferences } from "./useNotificationPreferences";
import { useCompanyFeatures } from "./useCompanyFeatures";

export const useMarketplacePermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { features, isLoading: featuresLoading } = useCompanyFeatures();

  const userCan = preferences?.can_access_marketplace ?? false;

  return {
    canAccessMarketplace: userCan && features.marketplace,
    isLoading: prefsLoading || featuresLoading,
  };
};
