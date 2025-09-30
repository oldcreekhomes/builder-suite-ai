import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface ProjectCheckSettings {
  id: string;
  project_id: string;
  owner_id: string;
  company_name?: string;
  company_address?: string;
  company_city_state?: string;
  last_check_number: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectCheckSettingsInput {
  company_name?: string;
  company_address?: string;
  company_city_state?: string;
  last_check_number?: number;
}

export function useProjectCheckSettings(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['project-check-settings', projectId],
    queryFn: async () => {
      if (!projectId || !user) return null;

      const { data, error } = await supabase
        .from('project_check_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching project check settings:', error);
        throw error;
      }

      return data as ProjectCheckSettings | null;
    },
    enabled: !!projectId && !!user,
  });

  const createOrUpdateSettings = useMutation({
    mutationFn: async (input: ProjectCheckSettingsInput) => {
      if (!projectId || !user) {
        throw new Error('Project ID and user are required');
      }

      // Get owner ID - use auth.uid() directly, backend functions will handle ownership
      const ownerIdToUse = user.id;

      const settingsData = {
        project_id: projectId,
        owner_id: ownerIdToUse,
        ...input
      };

      if (settings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('project_check_settings')
          .update(input)
          .eq('id', settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('project_check_settings')
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-check-settings', projectId] });
      toast({
        title: "Settings saved",
        description: "Project check settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Error saving project check settings:', error);
      toast({
        title: "Error",
        description: "Failed to save project check settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const incrementCheckNumber = useMutation({
    mutationFn: async () => {
      if (!projectId || !user) {
        throw new Error('Project ID and user are required');
      }

      const currentNumber = settings?.last_check_number || 0;
      const newNumber = currentNumber + 1;

      await createOrUpdateSettings.mutateAsync({
        last_check_number: newNumber
      });

      return newNumber;
    },
    onError: (error: any) => {
      console.error('Error incrementing check number:', error);
      toast({
        title: "Error",
        description: "Failed to update check number. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getNextCheckNumber = () => {
    const currentNumber = settings?.last_check_number || 0;
    return (currentNumber + 1).toString().padStart(3, '0');
  };

  return {
    settings,
    isLoading,
    error,
    createOrUpdateSettings,
    incrementCheckNumber,
    getNextCheckNumber
  };
}