import { useNotificationPreferences } from "./useNotificationPreferences";

export const useApartmentPermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canAccessApartments: (preferences as any)?.can_access_apartments ?? false,
    isLoading,
  };
};
