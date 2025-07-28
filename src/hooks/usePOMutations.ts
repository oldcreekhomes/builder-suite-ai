import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePOMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Send PO email mutation
  const sendPOEmail = useMutation({
    mutationFn: async ({ 
      biddingCompanyId, 
      projectAddress, 
      companyName, 
      proposals,
      senderCompanyName
    }: { 
      biddingCompanyId: string; 
      projectAddress: string; 
      companyName: string; 
      proposals?: string[];
      senderCompanyName?: string;
    }) => {
      console.log('Sending PO email:', { biddingCompanyId, projectAddress, companyName, proposals });
      
      const { data, error } = await supabase.functions.invoke('send-po-email', {
        body: {
          biddingCompanyId,
          projectAddress,
          companyName,
          proposals,
          senderCompanyName
        }
      });

      if (error) {
        console.error('Error sending PO email:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('PO email sent successfully:', data);
      toast({
        title: "PO Email Sent",
        description: data.message || `PO notification sent to ${data.emailsSent} recipients`,
      });
    },
    onError: (error: any) => {
      console.error('Failed to send PO email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send PO email",
        variant: "destructive",
      });
    },
  });

  // Update bidding package status to closed
  const updateBidPackageStatus = useMutation({
    mutationFn: async ({ bidPackageId }: { bidPackageId: string }) => {
      console.log('Updating bid package status to closed:', bidPackageId);
      
      const { error } = await supabase
        .from('project_bid_packages')
        .update({ 
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bidPackageId);

      if (error) {
        console.error('Error updating bid package status:', error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Bid package status updated to closed');
      // Invalidate bidding data to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      toast({
        title: "Status Updated",
        description: "Bid package moved to closed status",
      });
    },
    onError: (error: any) => {
      console.error('Failed to update bid package status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bid package status",
        variant: "destructive",
      });
    },
  });

  // Combined mutation to send PO and update status
  const sendPOAndUpdateStatus = useMutation({
    mutationFn: async ({ 
      biddingCompanyId, 
      bidPackageId,
      projectAddress, 
      companyName, 
      proposals,
      senderCompanyName
    }: { 
      biddingCompanyId: string; 
      bidPackageId: string;
      projectAddress: string; 
      companyName: string; 
      proposals?: string[];
      senderCompanyName?: string;
    }) => {
      // First send the PO email
      const emailData = await sendPOEmail.mutateAsync({
        biddingCompanyId,
        projectAddress,
        companyName,
        proposals,
        senderCompanyName
      });

      // Then update the bid package status
      await updateBidPackageStatus.mutateAsync({ bidPackageId });

      return { emailData };
    },
    onError: (error: any) => {
      console.error('Failed to send PO and update status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process PO",
        variant: "destructive",
      });
    },
  });

  return {
    sendPOEmail,
    updateBidPackageStatus,
    sendPOAndUpdateStatus,
    isLoading: sendPOEmail.isPending || updateBidPackageStatus.isPending || sendPOAndUpdateStatus.isPending,
  };
};