import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useUndoReconciliationPermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { isOwner, isLoading: roleLoading } = useUserRole();

  const isLoading = prefsLoading || roleLoading;

  // Owner ALWAYS has permission, OR user has explicit permission
  return {
    canUndoReconciliation: isOwner || (preferences?.can_undo_reconciliation ?? false),
    isLoading,
  };
};
