import { useNotificationPreferences } from "./useNotificationPreferences";

export const useDeleteBillsPermission = () => {
  const { preferences, isLoading } = useNotificationPreferences();
  return {
    canDeleteBills: isLoading ? false : (preferences.can_delete_bills ?? false),
    isLoading,
  };
};
