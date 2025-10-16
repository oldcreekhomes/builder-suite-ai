import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts } from "@/hooks/useAccounts";

interface BillForPayment {
  id: string;
  vendor_id: string;
  bill_date: string;
  due_date?: string | null;
  total_amount: number;
  reference_number?: string | null;
  terms?: string | null;
  companies?: {
    company_name: string;
  };
  projects?: {
    address: string;
  };
}

interface PayBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillForPayment | null;
  onConfirm: (billId: string, paymentAccountId: string, paymentDate: string, memo?: string) => void;
  isLoading?: boolean;
}

export function PayBillDialog({
  open,
  onOpenChange,
  bill,
  onConfirm,
  isLoading = false
}: PayBillDialogProps) {
  const { accounts } = useAccounts();
  const [paymentAccountId, setPaymentAccountId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [memo, setMemo] = useState<string>("");

  // Filter accounts for payment methods (Cash/Bank accounts and Credit Card accounts)
  const paymentAccounts = accounts.filter(account => 
    account.type === 'asset' && (
      account.name.toLowerCase().includes('cash') ||
      account.name.toLowerCase().includes('bank') ||
      account.name.toLowerCase().includes('checking') ||
      account.name.toLowerCase().includes('savings')
    )
  );

  const creditCardAccounts = accounts.filter(account =>
    account.type === 'liability' && (
      account.name.toLowerCase().includes('credit') ||
      account.name.toLowerCase().includes('card')
    )
  );

  const allPaymentMethods = [
    ...paymentAccounts.map(acc => ({ ...acc, category: 'Cash/Bank' })),
    ...creditCardAccounts.map(acc => ({ ...acc, category: 'Credit Card' }))
  ];

  const handleConfirm = () => {
    if (!bill || !paymentAccountId) return;
    
    onConfirm(bill.id, paymentAccountId, paymentDate, memo || undefined);
  };

  const resetForm = () => {
    setPaymentAccountId("");
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setMemo("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  if (!bill) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pay Bill</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Summary */}
          <div className="border bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Vendor:</span>
              <span>{bill.companies?.company_name || 'Unknown Vendor'}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{formatCurrency(bill.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Due Date:</span>
              <span>{bill.due_date ? format(new Date(bill.due_date), 'MMM dd, yyyy') : 'Not set'}</span>
            </div>
            {bill.reference_number && (
              <div className="flex justify-between">
                <span>Reference:</span>
                <span>{bill.reference_number}</span>
              </div>
            )}
          </div>

          {/* Payment Method and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {allPaymentMethods.length === 0 ? (
                    <SelectItem value="" disabled>
                      No payment accounts available
                    </SelectItem>
                  ) : (
                    allPaymentMethods.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.category === 'Credit Card' ? '💳' : '🏦'} {account.code} - {account.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {allPaymentMethods.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No payment accounts found. Please create Cash/Bank or Credit Card accounts first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Memo */}
          <div className="space-y-2">
            <Label htmlFor="memo">Payment Memo</Label>
            <Textarea
              id="memo"
              placeholder="Optional payment reference or memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!paymentAccountId || isLoading}
          >
            {isLoading ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}