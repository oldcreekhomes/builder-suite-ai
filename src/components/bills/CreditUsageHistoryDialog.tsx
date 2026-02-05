import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayFromAny } from "@/utils/dateOnly";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface CreditBill {
  id: string;
  vendor_id: string;
  total_amount: number;
  amount_paid?: number;
  reference_number: string | null;
  bill_date: string;
  companies?: {
    company_name: string;
  };
}

interface CreditUsageHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credit: CreditBill | null;
}

interface CreditAllocation {
  id: string;
  amount_allocated: number;
  bill_payment: {
    id: string;
    payment_date: string;
    payment_account: {
      name: string;
    };
  };
  applied_to_bill: {
    id: string;
    reference_number: string | null;
    total_amount: number;
    companies: {
      company_name: string;
    };
  };
}

export function CreditUsageHistoryDialog({
  open,
  onOpenChange,
  credit,
}: CreditUsageHistoryDialogProps) {
  const { data: allocations = [], isLoading } = useQuery({
    queryKey: ['credit-usage-history', credit?.id],
    queryFn: async () => {
      if (!credit?.id) return [];

      // Get allocations where this credit was used
      const { data, error } = await supabase
        .from('bill_payment_allocations')
        .select(`
          id,
          amount_allocated,
          bill_payment:bill_payment_id (
            id,
            payment_date,
            payment_account:payment_account_id (
              name
            )
          )
        `)
        .eq('bill_id', credit.id);

      if (error) throw error;

      // For each allocation, get the other bills in the same payment (the bills the credit was applied to)
      const results: CreditAllocation[] = [];
      
      for (const alloc of data || []) {
        const billPayment = alloc.bill_payment as any;
        if (!billPayment) continue;

        // Get all allocations for this payment (excluding the credit itself)
        const { data: otherAllocs, error: otherError } = await supabase
          .from('bill_payment_allocations')
          .select(`
            bill_id,
            amount_allocated,
            bill:bill_id (
              id,
              reference_number,
              total_amount,
              companies:vendor_id (
                company_name
              )
            )
          `)
          .eq('bill_payment_id', billPayment.id)
          .neq('bill_id', credit.id);

        if (otherError) throw otherError;

        // Add entry for each bill the credit was applied to
        for (const otherAlloc of otherAllocs || []) {
          const bill = otherAlloc.bill as any;
          if (!bill || bill.total_amount < 0) continue; // Skip other credits
          
          results.push({
            id: alloc.id,
            amount_allocated: alloc.amount_allocated,
            bill_payment: {
              id: billPayment.id,
              payment_date: billPayment.payment_date,
              payment_account: billPayment.payment_account,
            },
            applied_to_bill: {
              id: bill.id,
              reference_number: bill.reference_number,
              total_amount: bill.total_amount,
              companies: bill.companies,
            },
          });
        }
      }

      return results;
    },
    enabled: open && !!credit?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount));
  };

  const originalAmount = Math.abs(credit?.total_amount || 0);
  const totalUsed = credit?.amount_paid || 0;
  const remaining = originalAmount - totalUsed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Credit Usage History
            <Badge variant="outline" className="text-green-600 border-green-600">
              Credit
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {credit?.companies?.company_name} - {credit?.reference_number || 'No Reference'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credit Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Original Credit</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(originalAmount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Used</div>
              <div className="text-lg font-semibold">
                {formatCurrency(totalUsed)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(remaining)}
              </div>
            </div>
          </div>

          {/* Usage History Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : allocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No usage history found for this credit.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Applied To</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((alloc) => (
                  <TableRow key={alloc.id}>
                    <TableCell>
                      {formatDisplayFromAny(alloc.bill_payment.payment_date)}
                    </TableCell>
                    <TableCell>
                      {alloc.applied_to_bill.reference_number || 'No Ref'}
                    </TableCell>
                    <TableCell>
                      {alloc.applied_to_bill.companies?.company_name || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(alloc.amount_allocated)}
                    </TableCell>
                    <TableCell>
                      {alloc.bill_payment.payment_account?.name || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
