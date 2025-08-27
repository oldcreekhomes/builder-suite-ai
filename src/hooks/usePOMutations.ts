
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePOMutations = (projectId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create Purchase Order and send email mutation
  const createPOAndSendEmail = useMutation({
    mutationFn: async ({ 
      companyId,
      costCodeId,
      totalAmount,
      biddingCompany,
      bidPackageId,
      bidId
    }: { 
      companyId: string;
      costCodeId: string;
      totalAmount?: number;
      biddingCompany: any;
      bidPackageId?: string;
      bidId?: string;
    }) => {
      console.log('Creating PO and sending email:', { projectId, companyId, costCodeId, totalAmount, bidPackageId, bidId });
      
      // Step 1: Create the Purchase Order with proper linking
      const purchaseOrderData: any = {
        project_id: projectId,
        company_id: companyId,
        cost_code_id: costCodeId,
        total_amount: totalAmount || 0,
        status: 'draft',
        notes: `PO created from bid package for ${biddingCompany.companies.company_name}`
      };

      // Add bid package and bid IDs if provided (from bidding page)
      if (bidPackageId) {
        purchaseOrderData.bid_package_id = bidPackageId;
      }
      if (bidId) {
        purchaseOrderData.bid_id = bidId;
      }

      const { data: purchaseOrder, error: createError } = await supabase
        .from('project_purchase_orders')
        .insert([purchaseOrderData])
        .select()
        .single();

      if (createError) {
        console.error('Error creating purchase order:', createError);
        throw createError;
      }

      console.log('Purchase order created:', purchaseOrder);

      // Step 2: Send the PO email using the Purchase Order ID
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-po-email', {
        body: {
          purchaseOrderId: purchaseOrder.id,
          companyId: companyId
        }
      });

      if (emailError) {
        console.error('Error sending PO email:', emailError);
        throw emailError;
      }

      return { purchaseOrder, emailData };
    },
    onSuccess: (data) => {
      console.log('PO created and email sent successfully:', data);
      // Invalidate both purchase orders and bidding queries
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-bidding', projectId] });
      
      toast({
        title: "PO Email Sent",
        description: data.emailData.message || `PO notification sent to ${data.emailData.emailsSent} recipients`,
      });
    },
    onError: (error: any) => {
      console.error('Failed to create PO and send email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create PO and send email",
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

  // Combined mutation to create PO, send email, and update bid package status
  const createPOSendEmailAndUpdateStatus = useMutation({
    mutationFn: async ({ 
      companyId,
      costCodeId,
      totalAmount,
      biddingCompany,
      bidPackageId,
      bidId
    }: { 
      companyId: string;
      costCodeId: string;
      totalAmount?: number;
      biddingCompany: any;
      bidPackageId: string;
      bidId?: string;
    }) => {
      // First create PO and send email with proper linking
      const result = await createPOAndSendEmail.mutateAsync({
        companyId,
        costCodeId,
        totalAmount,
        biddingCompany,
        bidPackageId,
        bidId
      });

      // Then update the bid package status to closed
      await updateBidPackageStatus.mutateAsync({ bidPackageId });

      return result;
    },
    onError: (error: any) => {
      console.error('Failed to create PO, send email, and update status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process PO",
        variant: "destructive",
      });
    },
  });

  return {
    createPOAndSendEmail,
    updateBidPackageStatus,
    createPOSendEmailAndUpdateStatus,
    isLoading: createPOAndSendEmail.isPending || updateBidPackageStatus.isPending || createPOSendEmailAndUpdateStatus.isPending,
  };
};
