import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CheckPrintSettings {
  id: string;
  owner_id: string;
  project_id: string | null;
  name: string;
  
  // Page dimensions (inches)
  page_width: number;
  page_height: number;
  check_height: number;
  
  // Company info position
  company_name_x: number;
  company_name_y: number;
  
  // Check number position
  check_number_x: number;
  check_number_y: number;
  
  // Date field position
  date_x: number;
  date_y: number;
  
  // Amount in words position
  amount_words_x: number;
  amount_words_y: number;
  
  // Amount numeric position
  amount_numeric_x: number;
  amount_numeric_y: number;
  
  // Payee position
  payee_x: number;
  payee_y: number;
  
  // Stub positions
  stub_company_x: number;
  stub_company_y: number;
  stub_payee_x: number;
  stub_payee_y: number;
  stub_date_check_x: number;
  stub_date_check_y: number;
  stub_invoice_date_x: number;
  stub_invoice_date_y: number;
  stub_amount_x: number;
  stub_amount_y: number;
  stub_bank_x: number;
  stub_bank_y: number;
  stub_total_x: number;
  stub_total_y: number;
  
  // Font settings
  font_size: number;
  font_family: string;
  
  created_at: string;
  updated_at: string;
}

export type CheckPrintSettingsInput = Omit<CheckPrintSettings, 'id' | 'created_at' | 'updated_at'>;

// Default settings based on the analyzed check stock
export const DEFAULT_PRINT_SETTINGS: Omit<CheckPrintSettingsInput, 'owner_id' | 'project_id'> = {
  name: 'Default',
  page_width: 8.5,
  page_height: 11,
  check_height: 3.5,
  
  company_name_x: 0.25,
  company_name_y: 0.35,
  
  check_number_x: 7.0,
  check_number_y: 0.35,
  
  date_x: 7.0,
  date_y: 1.1,
  
  amount_words_x: 0.25,
  amount_words_y: 1.4,
  
  amount_numeric_x: 7.5,
  amount_numeric_y: 1.4,
  
  payee_x: 0.65,
  payee_y: 1.75,
  
  stub_company_x: 0.25,
  stub_company_y: 3.7,
  stub_payee_x: 0.5,
  stub_payee_y: 3.95,
  stub_date_check_x: 5.5,
  stub_date_check_y: 3.7,
  stub_invoice_date_x: 5.5,
  stub_invoice_date_y: 3.95,
  stub_amount_x: 7.5,
  stub_amount_y: 3.95,
  stub_bank_x: 0.25,
  stub_bank_y: 10.3,
  stub_total_x: 7.5,
  stub_total_y: 10.3,
  
  font_size: 10,
  font_family: 'Courier',
};

export function useCheckPrintSettings(projectId?: string) {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['check-print-settings', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Try to get project-specific settings first
      if (projectId) {
        const { data: projectSettings } = await supabase
          .from('check_print_settings')
          .select('*')
          .eq('owner_id', user.id)
          .eq('project_id', projectId)
          .maybeSingle();
        
        if (projectSettings) return projectSettings as CheckPrintSettings;
      }

      // Fall back to global settings (no project_id)
      const { data: globalSettings } = await supabase
        .from('check_print_settings')
        .select('*')
        .eq('owner_id', user.id)
        .is('project_id', null)
        .maybeSingle();

      return globalSettings as CheckPrintSettings | null;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (input: Partial<CheckPrintSettingsInput> & { project_id?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const settingsData = {
        ...DEFAULT_PRINT_SETTINGS,
        ...input,
        owner_id: user.id,
        project_id: input.project_id ?? null,
      };

      // Check if settings already exist
      const existingQuery = supabase
        .from('check_print_settings')
        .select('id')
        .eq('owner_id', user.id);

      if (input.project_id) {
        existingQuery.eq('project_id', input.project_id);
      } else {
        existingQuery.is('project_id', null);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('check_print_settings')
          .update(settingsData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('check_print_settings')
          .insert(settingsData)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['check-print-settings'] });
      toast.success('Check print settings saved');
    },
    onError: (error) => {
      console.error('Error saving check print settings:', error);
      toast.error('Failed to save check print settings');
    },
  });

  // Get effective settings (saved or defaults)
  const effectiveSettings: Omit<CheckPrintSettings, 'id' | 'owner_id' | 'created_at' | 'updated_at'> = settings ?? {
    ...DEFAULT_PRINT_SETTINGS,
    project_id: projectId ?? null,
  };

  return {
    settings,
    effectiveSettings,
    isLoading,
    error,
    saveSettings,
  };
}
