import { useNotificationPreferences } from "./useNotificationPreferences";

export const useTemplatePermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canAccessTemplates: preferences?.can_access_templates ?? false,
    isLoading,
  };
};
