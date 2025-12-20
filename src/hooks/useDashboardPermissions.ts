import { useNotificationPreferences } from "./useNotificationPreferences";

export const useDashboardPermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();
  
  const canAccessPMDashboard = preferences?.can_access_pm_dashboard ?? false;
  const canAccessOwnerDashboard = preferences?.can_access_owner_dashboard ?? false;
  
  // Determine default dashboard based on access
  const getDefaultDashboard = (): "project-manager" | "owner" => {
    if (canAccessPMDashboard) return "project-manager";
    if (canAccessOwnerDashboard) return "owner";
    return "project-manager"; // fallback
  };
  
  return {
    canAccessPMDashboard,
    canAccessOwnerDashboard,
    defaultDashboard: getDefaultDashboard(),
    isLoading,
  };
};
