import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlobalBiddingSettings } from '@/components/bidding/GlobalBiddingSettingsModal';
import { useState } from 'react';

export function useGlobalBiddingSettings(projectId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const applyGlobalSettings = useMutation({
    mutationFn: async (settings: GlobalBiddingSettings) => {
      console.log('Applying global bidding settings:', settings);
      setProgress(10);

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

      setProgress(30);

      // Handle file uploads if any files are provided
      let uploadedFiles: string[] = [];
      if (settings.files.length > 0) {
        const totalFiles = settings.files.length;
        for (let i = 0; i < settings.files.length; i++) {
          const file = settings.files[i];
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
          
          // Update progress for file uploads (30% to 70%)
          const fileProgress = ((i + 1) / totalFiles) * 40;
          setProgress(30 + fileProgress);
        }
      } else {
        setProgress(70);
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

      setProgress(80);

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

      setProgress(100);
      return { updatedCount: draftPackages.length, uploadedFiles };
    },
    onSuccess: (result) => {
      setTimeout(() => {
        setProgress(0); // Reset progress after a brief delay
        toast({
          title: "Global Settings Applied",
          description: `Updated ${result.updatedCount} draft bid packages successfully.`,
        });
        
        // Invalidate relevant queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      }, 500);
    },
    onError: (error: any) => {
      setProgress(0); // Reset progress
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
    progress,
  };
}