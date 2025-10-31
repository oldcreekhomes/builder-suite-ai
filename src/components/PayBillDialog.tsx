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
  amount_paid?: number;
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
  bills: BillForPayment | BillForPayment[] | null;
  onConfirm: (billIds: string[], paymentAccountId: string, paymentDate: string, memo?: string, paymentAmount?: number) => void;
  isLoading?: boolean;
}

export function PayBillDialog({
  open,
  onOpenChange,
  bills,
  onConfirm,
  isLoading = false
}: PayBillDialogProps) {
  const billsArray = Array.isArray(bills) ? bills : bills ? [bills] : [];
  const isMultiple = billsArray.length > 1;
  const { accounts } = useAccounts();
  const [paymentAccountId, setPaymentAccountId] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [memo, setMemo] = useState<string>("");
  
  // For single bill, calculate remaining balance and allow partial payment
  const singleBill = !isMultiple ? billsArray[0] : null;
  const remainingBalance = singleBill ? singleBill.total_amount - (singleBill.amount_paid || 0) : 0;
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentAmountError, setPaymentAmountError] = useState<string>("");

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
    if (billsArray.length === 0 || !paymentAccountId) return;
    
    // Validate payment amount for single bill
    if (!isMultiple) {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        setPaymentAmountError("Payment amount must be greater than $0");
        return;
      }
      if (amount > remainingBalance) {
        setPaymentAmountError(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`);
        return;
      }
    }
    
    const billIds = billsArray.map(b => b.id);
    const amount = !isMultiple ? parseFloat(paymentAmount) : undefined;
    onConfirm(billIds, paymentAccountId, paymentDate, memo || undefined, amount);
  };

  const resetForm = () => {
    setPaymentAccountId("");
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setMemo("");
    setPaymentAmount("");
    setPaymentAmountError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    } else {
      // When dialog opens, set default payment amount to remaining balance for single bill
      if (!isMultiple && singleBill) {
        const remaining = singleBill.total_amount - (singleBill.amount_paid || 0);
        setPaymentAmount(remaining.toFixed(2));
      }
    }
    onOpenChange(newOpen);
  };

  if (billsArray.length === 0) return null;
  
  const handlePaymentAmountChange = (value: string) => {
    setPaymentAmount(value);
    setPaymentAmountError("");
  };
  
  const parsedPaymentAmount = parseFloat(paymentAmount);
  const newRemainingBalance = !isNaN(parsedPaymentAmount) ? remainingBalance - parsedPaymentAmount : remainingBalance;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalAmount = billsArray.reduce((sum, bill) => sum + bill.total_amount, 0);
  const vendorName = billsArray[0]?.companies?.company_name || 'Unknown Vendor';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isMultiple ? `Pay ${billsArray.length} Bills` : 'Pay Bill'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Bill Summary */}
          <div className="border bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Vendor:</span>
              <span>{vendorName}</span>
            </div>
            {isMultiple ? (
              <>
                <div className="flex justify-between font-semibold">
                  <span>Total Amount ({billsArray.length} bills):</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <div className="text-sm font-medium mb-1">Bills:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {billsArray.map((bill) => (
                      <div key={bill.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {bill.reference_number || 'No ref'}
                        </span>
                        <span>{formatCurrency(bill.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Original Amount:</span>
                  <span className="font-semibold">{formatCurrency(billsArray[0].total_amount)}</span>
                </div>
                {(billsArray[0].amount_paid || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Previously Paid:</span>
                    <span>{formatCurrency(billsArray[0].amount_paid || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Remaining Balance:</span>
                  <span className="font-semibold">{formatCurrency(remainingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Due Date:</span>
                  <span>{billsArray[0].due_date ? format(new Date(billsArray[0].due_date), 'MMM dd, yyyy') : 'Not set'}</span>
                </div>
                {billsArray[0].reference_number && (
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span>{billsArray[0].reference_number}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Payment Amount (single bill only) */}
          {!isMultiple && (
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={paymentAmount}
                onChange={(e) => handlePaymentAmountChange(e.target.value)}
                placeholder="0.00"
                className={paymentAmountError ? "border-destructive" : ""}
              />
              {paymentAmountError && (
                <p className="text-sm text-destructive">{paymentAmountError}</p>
              )}
              {!paymentAmountError && !isNaN(parsedPaymentAmount) && parsedPaymentAmount > 0 && (
                <div className="text-sm text-muted-foreground">
                  After payment: <span className="font-medium">{formatCurrency(newRemainingBalance)}</span> remaining
                </div>
              )}
            </div>
          )}

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
            disabled={!paymentAccountId || isLoading || (!isMultiple && (!paymentAmount || parseFloat(paymentAmount) <= 0))}
          >
            {isLoading ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}