import { useNotificationPreferences } from "./useNotificationPreferences";

export const useBudgetLockPermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canLockBudgets: preferences?.can_lock_budgets ?? false,
    isLoading,
  };
};
