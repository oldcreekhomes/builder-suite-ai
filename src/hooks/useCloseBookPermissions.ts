import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useCloseBookPermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { isOwner, isLoading: roleLoading } = useUserRole();

  const isLoading = prefsLoading || roleLoading;

  if (isLoading) {
    return { canCloseBooks: false, isLoading };
  }

  // Owner ALWAYS has permission, OR user has explicit permission
  return {
    canCloseBooks: isOwner || (preferences.can_close_books ?? false),
    isLoading,
  };
};
