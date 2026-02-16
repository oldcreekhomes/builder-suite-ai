import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VendorPurchaseOrder } from "@/hooks/useVendorPurchaseOrders";
import { FileText, AlertTriangle, CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PODetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: VendorPurchaseOrder | null;
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);

export function PODetailsDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: PODetailsDialogProps) {
  if (!purchaseOrder) return null;

  const isOverBudget = purchaseOrder.remaining < 0;
  const utilizationPercent = purchaseOrder.total_amount > 0
    ? Math.round((purchaseOrder.total_billed / purchaseOrder.total_amount) * 100)
    : 0;
  const isWarning = utilizationPercent >= 90 && utilizationPercent < 100;
  const isHealthy = !isOverBudget && !isWarning;

  const lineItems = purchaseOrder.line_items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>PO {purchaseOrder.po_number}</span>
            <div className="ml-auto">
              {isOverBudget ? (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Over Budget</Badge>
              ) : isWarning ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1"><AlertTriangle className="h-3 w-3" />Near Limit</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />On Track</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4 py-3 border-b">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">PO Total</p>
            <p className="text-sm font-semibold">{formatCurrency(purchaseOrder.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Billed to Date</p>
            <p className="text-sm font-semibold">{formatCurrency(purchaseOrder.total_billed)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
            <p className={cn("text-sm font-semibold",
              isOverBudget && "text-destructive",
              isWarning && "text-amber-700",
              isHealthy && "text-green-700"
            )}>
              {formatCurrency(purchaseOrder.remaining)}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto">
          {lineItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table containerClassName="relative w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8"></TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Cost Code</TableHead>
                    <TableHead className="text-xs text-right">PO Amount</TableHead>
                    <TableHead className="text-xs text-right">Billed</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((line) => {
                    const lineOver = line.remaining < 0;
                    const lineComplete = line.total_billed >= line.amount && line.amount > 0;
                    const linePartial = line.total_billed > 0 && line.total_billed < line.amount;

                    return (
                      <TableRow key={line.id}>
                        <TableCell className="text-center px-2">
                          {lineComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : linePartial ? (
                            <CircleDot className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {line.description || '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {line.cost_code ? line.cost_code.code : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(line.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrency(line.total_billed)}
                        </TableCell>
                        <TableCell className={cn("text-xs text-right font-medium",
                          lineOver && "text-destructive",
                          lineComplete && "text-green-700",
                          linePartial && "text-amber-700"
                        )}>
                          {formatCurrency(line.remaining)}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell></TableCell>
                    <TableCell className="text-xs font-semibold">Total</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(lineItems.reduce((s, l) => s + l.amount, 0))}
                    </TableCell>
                    <TableCell className="text-xs text-right font-semibold">
                      {formatCurrency(lineItems.reduce((s, l) => s + l.total_billed, 0))}
                    </TableCell>
                    <TableCell className={cn("text-xs text-right font-semibold",
                      isOverBudget && "text-destructive",
                      isWarning && "text-amber-700",
                      isHealthy && "text-green-700"
                    )}>
                      {formatCurrency(lineItems.reduce((s, l) => s + l.remaining, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg bg-muted/30">
              No line items found for this purchase order.
            </p>
          )}
        </div>

        {isOverBudget && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">
              This PO is over budget by {formatCurrency(Math.abs(purchaseOrder.remaining))}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
