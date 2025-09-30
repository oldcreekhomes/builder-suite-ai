
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBiddingCompanyMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add company to bid package
  const addCompanyToBidPackage = useMutation({
    mutationFn: async ({ bidPackageId, companyId }: { bidPackageId: string; companyId: string }) => {
      console.log('Adding company to bid package:', { bidPackageId, companyId });
      
      const { data, error } = await supabase
        .from('project_bids')
        .insert([{
          bid_package_id: bidPackageId,
          company_id: companyId,
          bid_status: null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding company to bid package:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Company added to bid package successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to add company to bid package:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add company to bid package",
        variant: "destructive",
      });
    },
  });

  // Remove company from bid package
  const removeCompanyFromBidPackage = useMutation({
    mutationFn: async (bidId: string) => {
      console.log('Removing company from bid package:', bidId);
      
      const { error } = await supabase
        .from('project_bids')
        .delete()
        .eq('id', bidId);

      if (error) {
        console.error('Error removing company from bid package:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Company removed from bid package successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to remove company from bid package:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove company from bid package",
        variant: "destructive",
      });
    },
  });

  // Toggle bid status mutation
  const toggleBidStatusMutation = useMutation({
    mutationFn: async ({ bidId, status }: { bidId: string; status: string | null }) => {
      console.log('Updating bid status:', { bidId, status });
      
      const { error } = await supabase
        .from('project_bids')
        .update({ bid_status: status })
        .eq('id', bidId);

      if (error) {
        console.error('Error updating bid status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bid status updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to update bid status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bid status",
        variant: "destructive",
      });
    },
  });

  // Update bid price mutation
  const updatePriceMutation = useMutation({
    mutationFn: async ({ bidId, price }: { bidId: string; price: number | null }) => {
      console.log('Updating bid price:', { bidId, price });
      
      const { error } = await supabase
        .from('project_bids')
        .update({ price })
        .eq('id', bidId);

      if (error) {
        console.error('Error updating bid price:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bid price updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to update bid price:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bid price",
        variant: "destructive",
      });
    },
  });

  // Upload proposal mutation
  const uploadProposalMutation = useMutation({
    mutationFn: async ({ bidId, files }: { bidId: string; files: File[] }) => {
      console.log('Uploading proposal:', { bidId, files: files.length });
      
      const uploadedFileNames: string[] = [];
      
      for (const file of files) {
        const fileName = `proposal_${bidId}_${Date.now()}_${file.name}`;
        const filePath = `proposals/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;
        uploadedFileNames.push(fileName);
      }
      
      // Get current proposals and append new ones
      const { data: currentData, error: fetchError } = await supabase
        .from('project_bids')
        .select('proposals')
        .eq('id', bidId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentProposals = currentData?.proposals || [];
      const updatedProposals = [...currentProposals, ...uploadedFileNames];
      
      const { error } = await supabase
        .from('project_bids')
        .update({ proposals: updatedProposals })
        .eq('id', bidId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Proposal uploaded successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to upload proposal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload proposal",
        variant: "destructive",
      });
    },
  });

  // Delete individual proposal mutation
  const deleteIndividualProposalMutation = useMutation({
    mutationFn: async ({ bidId, fileName }: { bidId: string; fileName: string }) => {
      console.log('Deleting individual proposal:', { bidId, fileName });
      
      // Get current proposals
      const { data: currentData, error: fetchError } = await supabase
        .from('project_bids')
        .select('proposals')
        .eq('id', bidId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentProposals = currentData?.proposals || [];
      
      // Delete file from storage
      const filePath = `proposals/${fileName}`;
      const { error: deleteError } = await supabase.storage
        .from('project-files')
        .remove([filePath]);
        
      if (deleteError) console.error('Error deleting file from storage:', deleteError);
      
      // Remove from proposals array
      const updatedProposals = currentProposals.filter((f: string) => f !== fileName);
      
      // Update database
      const { error } = await supabase
        .from('project_bids')
        .update({ proposals: updatedProposals })
        .eq('id', bidId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Proposal deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to delete proposal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete proposal",
        variant: "destructive",
      });
    },
  });

  // Delete all proposals mutation
  const deleteAllProposalsMutation = useMutation({
    mutationFn: async ({ bidId }: { bidId: string }) => {
      console.log('Deleting all proposals:', bidId);
      
      // Get current proposals to delete from storage
      const { data: currentData, error: fetchError } = await supabase
        .from('project_bids')
        .select('proposals')
        .eq('id', bidId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const currentProposals = currentData?.proposals || [];
      
      // Delete files from storage
      if (currentProposals.length > 0) {
        const filePaths = currentProposals.map((fileName: string) => `proposals/${fileName}`);
        const { error: deleteError } = await supabase.storage
          .from('project-files')
          .remove(filePaths);
          
        if (deleteError) console.error('Error deleting files from storage:', deleteError);
      }
      
      // Clear proposals array in database
      const { error } = await supabase
        .from('project_bids')
        .update({ proposals: [] })
        .eq('id', bidId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "All proposals deleted successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to delete proposals:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete proposals",
        variant: "destructive",
      });
    },
  });

  // Delete company mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async ({ bidId }: { bidId: string }) => {
      console.log('Deleting company from bid package:', bidId);
      
      const { error } = await supabase
        .from('project_bids')
        .delete()
        .eq('id', bidId);

      if (error) {
        console.error('Error deleting company from bid package:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Company removed from bid package successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to remove company from bid package:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove company from bid package",
        variant: "destructive",
      });
    },
  });

  // Wrapper functions that match the expected interface
  const toggleBidStatus = (biddingItemId: string, bidId: string, newStatus: string | null) => {
    toggleBidStatusMutation.mutate({ bidId, status: newStatus });
  };

  const updatePrice = (biddingItemId: string, bidId: string, price: number | null) => {
    updatePriceMutation.mutate({ bidId, price });
  };

  const uploadProposal = (biddingItemId: string, bidId: string, files: File[]) => {
    uploadProposalMutation.mutate({ bidId, files });
  };

  const deleteIndividualProposal = (biddingItemId: string, bidId: string, fileName: string) => {
    deleteIndividualProposalMutation.mutate({ bidId, fileName });
  };

  const deleteAllProposals = (biddingItemId: string, bidId: string) => {
    deleteAllProposalsMutation.mutate({ bidId });
  };

  const deleteCompany = (biddingItemId: string, bidId: string) => {
    deleteCompanyMutation.mutate({ bidId });
  };

  return {
    addCompanyToBidPackage,
    removeCompanyFromBidPackage,
    toggleBidStatus,
    updatePrice,
    uploadProposal,
    deleteIndividualProposal,
    deleteAllProposals,
    deleteCompany,
    isLoading: addCompanyToBidPackage.isPending || 
               removeCompanyFromBidPackage.isPending || 
               toggleBidStatusMutation.isPending || 
               updatePriceMutation.isPending || 
               uploadProposalMutation.isPending || 
               deleteIndividualProposalMutation.isPending ||
               deleteAllProposalsMutation.isPending || 
               deleteCompanyMutation.isPending,
  };
};
