import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardCardSetting {
  id: string;
  user_id: string;
  company_name: string;
  dashboard_type: string;
  card_type: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PM_SETTINGS = [
  { dashboard_type: 'project_manager', card_type: 'insurance_alerts', enabled: true },
  { dashboard_type: 'project_manager', card_type: 'project_warnings', enabled: true },
  { dashboard_type: 'project_manager', card_type: 'recent_photos', enabled: true },
  { dashboard_type: 'project_manager', card_type: 'weather_forecast', enabled: true },
];

export const useDashboardCardSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['dashboard-card-settings'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's company name
      const { data: userData } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (!userData?.company_name) return [];

      // Fetch existing settings
      const { data: existingSettings, error } = await supabase
        .from('dashboard_card_settings')
        .select('*')
        .eq('company_name', userData.company_name);

      if (error) {
        console.error('Error fetching dashboard settings:', error);
        return [];
      }

      // If no settings exist, initialize defaults
      if (!existingSettings || existingSettings.length === 0) {
        const settingsToInsert = DEFAULT_PM_SETTINGS.map(setting => ({
          ...setting,
          user_id: user.id,
          company_name: userData.company_name,
        }));

        const { data: insertedSettings, error: insertError } = await supabase
          .from('dashboard_card_settings')
          .insert(settingsToInsert)
          .select();

        if (insertError) {
          console.error('Error initializing dashboard settings:', insertError);
          return [];
        }

        return insertedSettings as DashboardCardSetting[];
      }

      return existingSettings as DashboardCardSetting[];
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ 
      dashboard_type, 
      card_type, 
      enabled 
    }: { 
      dashboard_type: string; 
      card_type: string; 
      enabled: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', user.id)
        .single();

      if (!userData?.company_name) throw new Error('No company found');

      const { error } = await supabase
        .from('dashboard_card_settings')
        .upsert({
          user_id: user.id,
          company_name: userData.company_name,
          dashboard_type,
          card_type,
          enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'company_name,dashboard_type,card_type'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-card-settings'] });
      toast({
        title: "Settings updated",
        description: "Dashboard card settings have been saved.",
      });
    },
    onError: (error) => {
      console.error('Error updating dashboard setting:', error);
      toast({
        title: "Error",
        description: "Failed to update dashboard settings.",
        variant: "destructive",
      });
    },
  });

  return { settings, updateSetting, isLoading };
};
