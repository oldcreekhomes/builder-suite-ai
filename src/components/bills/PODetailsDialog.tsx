import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { FileText, AlertTriangle, DollarSign, Receipt, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PODetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: VendorPurchaseOrder | null;
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
}

export function PODetailsDialog({
  open,
  onOpenChange,
  purchaseOrder,
  projectId,
  vendorId,
}: PODetailsDialogProps) {
  // Fetch related bills for this PO
  const { data: relatedBills } = useQuery({
    queryKey: ['po-related-bills', purchaseOrder?.id, purchaseOrder?.cost_code_id, projectId, vendorId],
    queryFn: async () => {
      if (!purchaseOrder || !projectId || !vendorId) return [];

      // Get bills by explicit PO link or by cost code match
      const { data: bills, error } = await supabase
        .from('bills')
        .select(`
          id,
          reference_number,
          bill_date,
          total_amount,
          status,
          bill_lines!inner (
            purchase_order_id,
            cost_code_id,
            amount
          )
        `)
        .eq('project_id', projectId)
        .eq('vendor_id', vendorId)
        .in('status', ['posted', 'paid'])
        .eq('is_reversal', false)
        .is('reversed_at', null);

      if (error) throw error;

      // Filter bills that match this PO (by explicit link or cost code)
      return (bills || []).filter(bill => {
        return bill.bill_lines.some((line: { purchase_order_id: string | null; cost_code_id: string | null }) => 
          line.purchase_order_id === purchaseOrder.id ||
          (!line.purchase_order_id && line.cost_code_id === purchaseOrder.cost_code_id)
        );
      }).map(bill => ({
        id: bill.id,
        reference_number: bill.reference_number,
        bill_date: bill.bill_date,
        total_amount: bill.total_amount,
        status: bill.status,
        lineAmount: bill.bill_lines
          .filter((line: { purchase_order_id: string | null; cost_code_id: string | null }) => 
            line.purchase_order_id === purchaseOrder.id ||
            (!line.purchase_order_id && line.cost_code_id === purchaseOrder.cost_code_id)
          )
          .reduce((sum: number, line: { amount: number }) => sum + (line.amount || 0), 0)
      }));
    },
    enabled: open && !!purchaseOrder && !!projectId && !!vendorId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!purchaseOrder) return null;

  const isOverBudget = purchaseOrder.remaining < 0;
  const utilizationPercent = purchaseOrder.total_amount > 0
    ? Math.round((purchaseOrder.total_billed / purchaseOrder.total_amount) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Purchase Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* PO Number and Cost Code */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-base font-mono px-3 py-1">
              {purchaseOrder.po_number}
            </Badge>
            {purchaseOrder.cost_code && (
              <span className="text-sm text-muted-foreground">
                {purchaseOrder.cost_code.code} - {purchaseOrder.cost_code.name}
              </span>
            )}
          </div>

          {/* Over budget warning */}
          {isOverBudget && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Over budget by {formatCurrency(Math.abs(purchaseOrder.remaining))}
              </span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-semibold">{formatCurrency(purchaseOrder.total_amount)}</div>
                <div className="text-xs text-muted-foreground">PO Amount</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Receipt className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-semibold">{formatCurrency(purchaseOrder.total_billed)}</div>
                <div className="text-xs text-muted-foreground">Billed ({utilizationPercent}%)</div>
              </CardContent>
            </Card>
            <Card className={isOverBudget ? "border-destructive" : ""}>
              <CardContent className="p-3 text-center">
                <TrendingDown className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className={`text-lg font-semibold ${isOverBudget ? "text-destructive" : ""}`}>
                  {formatCurrency(purchaseOrder.remaining)}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </CardContent>
            </Card>
          </div>

          {/* Related Bills */}
          {relatedBills && relatedBills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Related Bills</h4>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {relatedBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {bill.reference_number || 'No Ref'}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(bill.bill_date), 'MM/dd/yy')}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(bill.lineAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedBills && relatedBills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bills have been posted against this PO yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
