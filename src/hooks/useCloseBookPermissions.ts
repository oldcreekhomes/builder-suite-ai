import { useNotificationPreferences } from "./useNotificationPreferences";

export const useCloseBookPermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canCloseBooks: preferences?.can_close_books ?? false,
    isLoading,
  };
};
