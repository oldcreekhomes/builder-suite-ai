import { useNotificationPreferences } from "./useNotificationPreferences";

/**
 * Permission to reallocate a transaction's account/cost code after the
 * accounting period has been closed or reconciled. Amount and date are
 * never changed by a reallocation, so the books are not affected.
 *
 * Default OFF for everyone (including owners) — must be explicitly enabled
 * per-employee in the Edit Employee → Access tab.
 */
export const useReallocationPermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canReallocate: (preferences as any)?.can_reallocate ?? false,
    isLoading,
  };
};
