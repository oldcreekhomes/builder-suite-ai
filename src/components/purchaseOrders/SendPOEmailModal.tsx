import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface SendPOEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  projectAddress?: string;
}

export function SendPOEmailModal({
  open,
  onOpenChange,
  purchaseOrder,
  projectAddress
}: SendPOEmailModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Pre-check: Verify company has representatives with PO notifications enabled
      const { data: representatives } = await supabase
        .from('company_representatives')
        .select('id')
        .eq('company_id', purchaseOrder.company_id)
        .eq('receive_po_notifications', true);

      if (!representatives || representatives.length === 0) {
        toast({
          title: "Error",
          description: "You do not have any Representatives set up for PO email notifications.\u00A0\u00A0Go to Companies -> Representatives -> choose one Representative to receive PO's.",
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }

      // Get sender company name from current user
      const { data: userData } = await supabase.auth.getUser();
      const { data: userDetails } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', userData.user?.id)
        .single();

      const { data, error } = await supabase.functions.invoke('send-po-email', {
        body: {
          purchaseOrderId: purchaseOrder.id,
          companyId: purchaseOrder.company_id,
          projectAddress: projectAddress || 'N/A',
          companyName: purchaseOrder.companies?.company_name || 'N/A',
          customMessage: customMessage.trim() || undefined,
          totalAmount: purchaseOrder.total_amount,
          costCode: purchaseOrder.cost_codes,
          senderCompanyName: userDetails?.company_name || 'Builder Suite AI'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order email sent successfully",
      });
      
      onOpenChange(false);
      setCustomMessage('');
    } catch (error: any) {
      console.error('Error sending PO email:', error);
      
      // Check if the error is about missing representatives
      // Check multiple possible error locations
      const errorMessage = error?.message || error?.error || JSON.stringify(error) || '';
      const isNoRepresentativesError = errorMessage.toLowerCase().includes('no representatives');
      
      toast({
        title: "Error",
        description: isNoRepresentativesError 
          ? "You do not have any Representatives set up for PO email notifications.\u00A0\u00A0Go to Companies -> Representatives -> choose one Representative to receive PO's."
          : "Failed to send purchase order email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Purchase Order Email</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Company</Label>
            <p className="text-sm text-gray-600">{purchaseOrder.companies?.company_name}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Cost Code</Label>
            <p className="text-sm text-gray-600">
              {purchaseOrder.cost_codes?.code} - {purchaseOrder.cost_codes?.name}
            </p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Amount</Label>
            <p className="text-sm text-gray-600">
              {purchaseOrder.total_amount ? `$${purchaseOrder.total_amount.toLocaleString()}` : 'N/A'}
            </p>
          </div>
          
          <div>
            <Label htmlFor="custom-message">Custom Message (Optional)</Label>
            <Textarea
              id="custom-message"
              placeholder="Add a custom message to include in the email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}