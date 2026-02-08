import { useNotificationPreferences } from "./useNotificationPreferences";

export const useMarketplacePermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canAccessMarketplace: preferences.can_access_marketplace ?? false,
    isLoading,
  };
};
