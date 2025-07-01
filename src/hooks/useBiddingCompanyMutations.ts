
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBiddingCompanyMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Toggle company bid status
  const toggleBidStatus = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      currentStatus 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      currentStatus: string; 
    }) => {
      const newStatus = currentStatus === 'will_bid' ? 'will_not_bid' : 'will_bid';
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('project_bidding_companies')
        .select('id')
        .eq('project_bidding_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('project_bidding_companies')
          .update({ bid_status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('project_bidding_companies')
          .insert({
            project_bidding_id: biddingItemId,
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

  return {
    toggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => {
      toggleBidStatus.mutate({ biddingItemId, companyId, currentStatus });
    },
    isLoading: toggleBidStatus.isPending,
  };
};
