import { useNotificationPreferences } from "./useNotificationPreferences";

export type DashboardView = "project-manager" | "owner" | "accountant";

export const useDashboardPermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();
  
  const canAccessPMDashboard = preferences?.can_access_pm_dashboard ?? false;
  const canAccessOwnerDashboard = preferences?.can_access_owner_dashboard ?? false;
  const canAccessAccountantDashboard = preferences?.can_access_accountant_dashboard ?? false;
  
  // Determine default dashboard based on access
  const getDefaultDashboard = (): DashboardView => {
    if (canAccessPMDashboard) return "project-manager";
    if (canAccessOwnerDashboard) return "owner";
    if (canAccessAccountantDashboard) return "accountant";
    return "project-manager"; // fallback
  };
  
  return {
    canAccessPMDashboard,
    canAccessOwnerDashboard,
    canAccessAccountantDashboard,
    defaultDashboard: getDefaultDashboard(),
    isLoading,
  };
};
