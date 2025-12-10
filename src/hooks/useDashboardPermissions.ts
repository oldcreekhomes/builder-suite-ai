import { useNotificationPreferences } from "./useNotificationPreferences";
import { useUserRole } from "./useUserRole";

export const useDashboardPermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { isOwner, isLoading: roleLoading } = useUserRole();
  
  // Owner always has access to both dashboards
  const canAccessPMDashboard = isOwner || preferences?.can_access_pm_dashboard;
  const canAccessOwnerDashboard = isOwner || preferences?.can_access_owner_dashboard;
  
  // Determine default dashboard based on access
  const getDefaultDashboard = (): "project-manager" | "owner" => {
    if (canAccessPMDashboard) return "project-manager";
    if (canAccessOwnerDashboard) return "owner";
    return "project-manager"; // fallback
  };
  
  return {
    canAccessPMDashboard: canAccessPMDashboard ?? true,
    canAccessOwnerDashboard: canAccessOwnerDashboard ?? false,
    defaultDashboard: getDefaultDashboard(),
    isLoading: prefsLoading || roleLoading,
  };
};
