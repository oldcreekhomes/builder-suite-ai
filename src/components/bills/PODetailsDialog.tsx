import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { FileText, AlertTriangle, DollarSign, Receipt, TrendingDown, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatDateSafe } from "@/utils/dateOnly";
import { cn } from "@/lib/utils";

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
    ? Math.min(100, Math.round((purchaseOrder.total_billed / purchaseOrder.total_amount) * 100))
    : 0;
  const isHealthy = purchaseOrder.remaining > 0 && utilizationPercent < 90;
  const isWarning = utilizationPercent >= 90 && utilizationPercent < 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Purchase Order Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* PO Number and Cost Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">PO Number</p>
                <Badge variant="outline" className="text-base font-mono px-3 py-1 mt-1">
                  {purchaseOrder.po_number}
                </Badge>
              </div>
              {/* Status indicator */}
              <div className="text-right">
                {isOverBudget ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Over Budget
                  </Badge>
                ) : isWarning ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Near Limit
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    On Track
                  </Badge>
                )}
              </div>
            </div>
            
            {purchaseOrder.cost_code && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Cost Code</p>
                <p className="text-sm font-medium mt-1">
                  {purchaseOrder.cost_code.code} - {purchaseOrder.cost_code.name}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar with remaining indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budget Utilization</span>
              <span className="font-medium">{utilizationPercent}%</span>
            </div>
            <Progress 
              value={Math.min(utilizationPercent, 100)} 
              className={cn(
                "h-3",
                isOverBudget && "[&>div]:bg-destructive",
                isWarning && "[&>div]:bg-amber-500",
                isHealthy && "[&>div]:bg-green-500"
              )}
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-semibold">{formatCurrency(purchaseOrder.total_amount)}</div>
                <div className="text-xs text-muted-foreground">PO Budget</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Receipt className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-semibold">{formatCurrency(purchaseOrder.total_billed)}</div>
                <div className="text-xs text-muted-foreground">Billed to Date</div>
              </CardContent>
            </Card>
            <Card className={cn(
              isOverBudget && "border-destructive bg-destructive/5",
              isWarning && "border-amber-500 bg-amber-50",
              isHealthy && "border-green-500 bg-green-50"
            )}>
              <CardContent className="p-3 text-center">
                <TrendingDown className={cn(
                  "h-4 w-4 mx-auto mb-1",
                  isOverBudget && "text-destructive",
                  isWarning && "text-amber-600",
                  isHealthy && "text-green-600"
                )} />
                <div className={cn(
                  "text-lg font-semibold",
                  isOverBudget && "text-destructive",
                  isWarning && "text-amber-700",
                  isHealthy && "text-green-700"
                )}>
                  {formatCurrency(purchaseOrder.remaining)}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </CardContent>
            </Card>
          </div>

          {/* Over budget warning message */}
          {isOverBudget && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive">
                This PO is over budget by {formatCurrency(Math.abs(purchaseOrder.remaining))}
              </span>
            </div>
          )}

          {/* Related Bills */}
          {relatedBills && relatedBills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Bills Charged to This PO</h4>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Reference</span>
                  <span>Date</span>
                  <span className="text-right">Amount</span>
                </div>
                {relatedBills.map((bill) => (
                  <div key={bill.id} className="grid grid-cols-3 gap-2 px-3 py-2 text-sm">
                    <span className="font-mono text-xs">
                      {bill.reference_number || '—'}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateSafe(bill.bill_date, 'MM/dd/yy')}
                    </span>
                    <span className="font-medium text-right">{formatCurrency(bill.lineAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedBills && relatedBills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
              No bills have been posted against this PO yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
