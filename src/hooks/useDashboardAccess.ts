import { useUserRole } from "./useUserRole";
import { useNotificationPreferences } from "./useNotificationPreferences";
import { useAuth } from "./useAuth";

export type DashboardType = 'project_manager' | 'accountant';

export const useDashboardAccess = () => {
  const { user } = useAuth();
  const { isOwner, isLoading: roleLoading } = useUserRole();
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences(user?.id);

  const isLoading = roleLoading || prefsLoading;
  
  // Owner always sees both dashboards with tabs
  const showTabs = isOwner;
  
  // For employees, use their assigned dashboard_type
  const dashboardType = (preferences?.dashboard_type as DashboardType) || 'project_manager';
  
  // Available dashboards for the user
  const availableDashboards: DashboardType[] = isOwner 
    ? ['project_manager', 'accountant'] 
    : [dashboardType];

  return {
    isOwner,
    dashboardType,
    showTabs,
    availableDashboards,
    isLoading,
  };
};
