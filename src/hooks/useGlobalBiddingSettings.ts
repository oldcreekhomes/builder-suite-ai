import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlobalBiddingSettings } from '@/components/bidding/GlobalBiddingSettingsModal';

export function useGlobalBiddingSettings(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const applyGlobalSettings = useMutation({
    mutationFn: async (settings: GlobalBiddingSettings) => {
      console.log('Applying global bidding settings:', settings);

      // First, get all draft bid packages for this project
      const { data: draftPackages, error: fetchError } = await supabase
        .from('project_bid_packages')
        .select('id, files')
        .eq('project_id', projectId)
        .eq('status', 'draft');

      if (fetchError) {
        console.error('Error fetching draft packages:', fetchError);
        throw fetchError;
      }

      if (!draftPackages || draftPackages.length === 0) {
        throw new Error('No draft bid packages found to update');
      }

      // Handle file uploads if any files are provided
      let uploadedFiles: string[] = [];
      if (settings.files.length > 0) {
        for (const file of settings.files) {
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = `bidding/${projectId}/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            throw uploadError;
          }

          uploadedFiles.push(filePath);
        }
      }

      // Prepare the update data
      const updateData: any = {};
      
      if (settings.dueDate) {
        updateData.due_date = settings.dueDate.toISOString();
      }
      
      if (settings.reminderDate) {
        updateData.reminder_date = settings.reminderDate.toISOString();
      }
      
      if (uploadedFiles.length > 0) {
        updateData.files = uploadedFiles;
      }

      // Update all draft bid packages
      const { error: updateError } = await supabase
        .from('project_bid_packages')
        .update(updateData)
        .eq('project_id', projectId)
        .eq('status', 'draft');

      if (updateError) {
        console.error('Error updating bid packages:', updateError);
        throw updateError;
      }

      return { updatedCount: draftPackages.length, uploadedFiles };
    },
    onSuccess: (result) => {
      toast({
        title: "Global Settings Applied",
        description: `Updated ${result.updatedCount} draft bid packages successfully.`,
      });
      
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['bidding-data', projectId] });
    },
    onError: (error: any) => {
      console.error('Error applying global settings:', error);
      toast({
        title: "Error Applying Settings",
        description: error.message || "Failed to apply global settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    applyGlobalSettings: applyGlobalSettings.mutate,
    isApplying: applyGlobalSettings.isPending,
  };
}