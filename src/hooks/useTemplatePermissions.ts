import { useNotificationPreferences } from "./useNotificationPreferences";
import { useCompanyFeatures } from "./useCompanyFeatures";

export const useTemplatePermissions = () => {
  const { preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const { features, isLoading: featuresLoading } = useCompanyFeatures();

  const userCanAccess = preferences?.can_access_templates ?? false;
  const userCanEdit = preferences?.can_edit_templates ?? false;

  return {
    canAccessTemplates: userCanAccess && features.templates,
    canEditTemplates: userCanEdit && features.templates,
    isLoading: prefsLoading || featuresLoading,
  };
};
