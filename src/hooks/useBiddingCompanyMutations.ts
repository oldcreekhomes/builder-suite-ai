
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
        .from('project_bidding_companies')
        .select('id')
        .eq('project_bidding_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('project_bidding_companies')
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

  // Update due date
  const updateDueDate = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      dueDate 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      dueDate: string | null; 
    }) => {
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
          .update({ due_date: dueDate, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
    },
    onError: (error) => {
      console.error('Error updating due date:', error);
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    },
  });

  // Update reminder date
  const updateReminderDate = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      reminderDate 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      reminderDate: string | null; 
    }) => {
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
          .update({ reminder_date: reminderDate, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
    },
    onError: (error) => {
      console.error('Error updating reminder date:', error);
      toast({
        title: "Error",
        description: "Failed to update reminder date",
        variant: "destructive",
      });
    },
  });

  // Upload proposal file
  const uploadProposal = useMutation({
    mutationFn: async ({ 
      biddingItemId, 
      companyId, 
      file 
    }: { 
      biddingItemId: string; 
      companyId: string; 
      file: File; 
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${biddingItemId}-${companyId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(`proposals/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Update database with file name
      const { data: existing } = await supabase
        .from('project_bidding_companies')
        .select('id')
        .eq('project_bidding_id', biddingItemId)
        .eq('company_id', companyId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('project_bidding_companies')
          .update({ proposals: fileName, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Success",
        description: "Proposal uploaded successfully",
      });
    },
    onError: (error) => {
      console.error('Error uploading proposal:', error);
      toast({
        title: "Error",
        description: "Failed to upload proposal",
        variant: "destructive",
      });
    },
  });

  return {
    toggleBidStatus: (biddingItemId: string, companyId: string, currentStatus: string) => {
      toggleBidStatus.mutate({ biddingItemId, companyId, currentStatus });
    },
    updatePrice: (biddingItemId: string, companyId: string, price: number | null) => {
      updatePrice.mutate({ biddingItemId, companyId, price });
    },
    updateDueDate: (biddingItemId: string, companyId: string, dueDate: string | null) => {
      updateDueDate.mutate({ biddingItemId, companyId, dueDate });
    },
    updateReminderDate: (biddingItemId: string, companyId: string, reminderDate: string | null) => {
      updateReminderDate.mutate({ biddingItemId, companyId, reminderDate });
    },
    uploadProposal: (biddingItemId: string, companyId: string, file: File) => {
      uploadProposal.mutate({ biddingItemId, companyId, file });
    },
    isLoading: toggleBidStatus.isPending || updatePrice.isPending || updateDueDate.isPending || updateReminderDate.isPending || uploadProposal.isPending,
  };
};
