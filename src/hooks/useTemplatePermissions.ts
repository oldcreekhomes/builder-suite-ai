import { useNotificationPreferences } from "./useNotificationPreferences";

export const useTemplatePermissions = () => {
  const { preferences, isLoading } = useNotificationPreferences();

  return {
    canAccessTemplates: preferences?.can_access_templates ?? false,
    canEditTemplates: preferences?.can_edit_templates ?? false,
    isLoading,
  };
};
