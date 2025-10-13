import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PurchaseOrder } from '@/hooks/usePurchaseOrders';

interface SendPOTestEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrder;
  projectAddress?: string;
}

export function SendPOTestEmailModal({
  open,
  onOpenChange,
  purchaseOrder,
  projectAddress
}: SendPOTestEmailModalProps) {
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
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
          poNumber: purchaseOrder.po_number,
          projectAddress: projectAddress || 'N/A',
          companyName: purchaseOrder.companies?.company_name || 'N/A',
          totalAmount: purchaseOrder.total_amount,
          costCode: purchaseOrder.cost_codes,
          testEmail: testEmail.trim(),
          senderCompanyName: userDetails?.company_name || 'Builder Suite AI'
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Test email sent to ${testEmail}`,
      });
      
      onOpenChange(false);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test PO email:', error);
      toast({
        title: "Error",
        description: "Failed to send test email",
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
          <DialogTitle>Send Test Purchase Order Email</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="Enter test email address..."
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          
          <div className="text-sm text-gray-600">
            <p>This will send a test purchase order email for:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Company: {purchaseOrder.companies?.company_name}</li>
              <li>Cost Code: {purchaseOrder.cost_codes?.code} - {purchaseOrder.cost_codes?.name}</li>
              <li>Amount: {purchaseOrder.total_amount ? `$${purchaseOrder.total_amount.toLocaleString()}` : 'N/A'}</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}