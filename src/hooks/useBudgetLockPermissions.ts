import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useBudgetLockPermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { isOwner, isLoading: roleLoading } = useUserRole();

  const isLoading = prefsLoading || roleLoading;

  if (isLoading) {
    return { canLockBudgets: false, isLoading };
  }

  // Owner ALWAYS has permission, OR user has explicit permission
  return {
    canLockBudgets: isOwner || (preferences.can_lock_budgets ?? false),
    isLoading,
  };
};
