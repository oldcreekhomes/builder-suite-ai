
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
          bid_status: 'invited'
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

  // Update bid status
  const updateBidStatus = useMutation({
    mutationFn: async ({ bidId, status }: { bidId: string; status: string }) => {
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

  // Update bid price
  const updateBidPrice = useMutation({
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

  // Update bid proposals
  const updateBidProposals = useMutation({
    mutationFn: async ({ bidId, proposals }: { bidId: string; proposals: string[] }) => {
      console.log('Updating bid proposals:', { bidId, proposals });
      
      const { error } = await supabase
        .from('project_bids')
        .update({ proposals })
        .eq('id', bidId);

      if (error) {
        console.error('Error updating bid proposals:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Bid proposals updated successfully",
      });
    },
    onError: (error: any) => {
      console.error('Failed to update bid proposals:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bid proposals",
        variant: "destructive",
      });
    },
  });

  return {
    addCompanyToBidPackage,
    removeCompanyFromBidPackage,
    updateBidStatus,
    updateBidPrice,
    updateBidProposals,
    isLoading: addCompanyToBidPackage.isPending || 
               removeCompanyFromBidPackage.isPending || 
               updateBidStatus.isPending || 
               updateBidPrice.isPending || 
               updateBidProposals.isPending,
  };
};
