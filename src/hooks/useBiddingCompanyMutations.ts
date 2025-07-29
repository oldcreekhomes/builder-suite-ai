import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBiddingCompanyMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update company bid status
  const updateBidStatus = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      newStatus 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      newStatus: string | null; 
    }) => {
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('project_bid_package_companies')
        .select('id')
        .eq('bid_package_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('project_bid_package_companies')
          .update({ bid_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('project_bid_package_companies')
          .insert({
            bid_package_id: biddingItemId,
            company_id: companyId,
            bid_status: newStatus
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Company bid status updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating bid status:', error);
      toast({
        title: "Error",
        description: "Failed to update company bid status",
        variant: "destructive",
      });
    },
  });

  // Update company price
  const updatePrice = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      price 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      price: number | null; 
    }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('project_bid_package_companies')
        .select('id')
        .eq('bid_package_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('project_bid_package_companies')
          .update({ price: price, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
    },
    onError: (error) => {
      console.error('Error updating price:', error);
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive",
      });
    },
  });

  // Upload proposal files
  const uploadProposal = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      files 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      files: File[]; 
    }) => {
      console.log('Upload starting for:', { biddingItemId, companyId, fileCount: files.length });
      const uploadedFileNames: string[] = [];
      
      // Upload all files to storage
      for (const file of files) {
        console.log('Uploading file:', file.name);
        const fileExt = file.name.split('.').pop();
        const fileName = `${biddingItemId}-${companyId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(`proposals/${fileName}`, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }
        console.log('File uploaded successfully:', fileName);
        uploadedFileNames.push(fileName);
      }

      console.log('All files uploaded, now updating database...');
      
      // Get existing proposals and add new ones
      const { data: existing, error: selectError } = await supabase
        .from('project_bid_package_companies')
        .select('id, proposals')
        .eq('bid_package_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      console.log('Database lookup result:', { existing, selectError });

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error finding existing record:', selectError);
        throw selectError;
      }

      if (existing) {
        console.log('Updating existing record:', existing.id);
        // Update existing record
        const currentProposals = existing.proposals || [];
        const updatedProposals = [...currentProposals, ...uploadedFileNames];
        
        const { error: updateError } = await supabase
          .from('project_bid_package_companies')
          .update({ proposals: updatedProposals, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('Error updating proposals:', updateError);
          throw updateError;
        }
        console.log('Successfully updated existing record');
      } else {
        console.log('Creating new record...');
        // Create new record if it doesn't exist
        const { error: insertError } = await supabase
          .from('project_bid_package_companies')
          .insert({
            bid_package_id: biddingItemId,
            company_id: companyId,
            bid_status: null,
            proposals: uploadedFileNames
          });
        
        if (insertError) {
          console.error('Error creating new bidding record:', insertError);
          throw insertError;
        }
        console.log('Successfully created new record');
      }
      
      console.log('Upload process completed successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Proposals uploaded successfully",
      });
    },
    onError: (error) => {
      console.error('Error uploading proposals:', error);
      toast({
        title: "Error",
        description: "Failed to upload proposals",
        variant: "destructive",
      });
    },
  });

  // Delete all proposal files for a company
  const deleteAllProposals = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId
    }: { 
      biddingItemId: string; 
      companyId: string;
    }) => {
      // Get existing proposals to delete from storage
      const { data: existing } = await supabase
        .from('project_bid_package_companies')
        .select('id, proposals')
        .eq('bid_package_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      if (existing && existing.proposals) {
        // Delete all files from storage
        const filesToDelete = existing.proposals.map((fileName: string) => `proposals/${fileName}`);
        const { error: deleteError } = await supabase.storage
          .from('project-files')
          .remove(filesToDelete);

        if (deleteError) console.warn('Could not delete some files from storage:', deleteError);

        // Clear proposals array in database
        const { error } = await supabase
          .from('project_bid_package_companies')
          .update({ 
            proposals: [], 
            updated_at: new Date().toISOString() 
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "All proposals deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting proposals:', error);
      toast({
        title: "Error",
        description: "Failed to delete proposals",
        variant: "destructive",
      });
    },
  });

  // Delete company from bidding item
  const deleteCompany = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId 
    }: { 
      biddingItemId: string; 
      companyId: string; 
    }) => {
      const { error } = await supabase
        .from('project_bid_package_companies')
        .delete()
        .eq('bid_package_id', biddingItemId)
        .eq('company_id', companyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Company removed from bidding package successfully",
      });
    },
    onError: (error) => {
      console.error('Error deleting company:', error);
      toast({
        title: "Error",
        description: "Failed to remove company from bidding package",
        variant: "destructive",
      });
    },
  });

  return {
    toggleBidStatus: (biddingItemId: string, companyId: string, newStatus: string | null) => {
      updateBidStatus.mutate({ biddingItemId, companyId, newStatus });
    },
    updatePrice: (biddingItemId: string, companyId: string, price: number | null) => {
      updatePrice.mutate({ biddingItemId, companyId, price });
    },
    uploadProposal: (biddingItemId: string, companyId: string, files: File[]) => {
      uploadProposal.mutate({ biddingItemId, companyId, files });
    },
    deleteAllProposals: (biddingItemId: string, companyId: string) => {
      deleteAllProposals.mutate({ biddingItemId, companyId });
    },
    deleteCompany: (biddingItemId: string, companyId: string) => {
      deleteCompany.mutate({ biddingItemId, companyId });
    },
    isLoading: updateBidStatus.isPending || updatePrice.isPending || uploadProposal.isPending || deleteAllProposals.isPending || deleteCompany.isPending,
  };
};