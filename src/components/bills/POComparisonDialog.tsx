import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, FileText } from "lucide-react";
import { POMatch, usePORelatedBills } from "@/hooks/useBillPOMatching";
import { formatDisplayFromAny } from "@/utils/dateOnly";
import { Skeleton } from "@/components/ui/skeleton";

interface POComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poMatch: POMatch | null;
  projectId: string | null;
  vendorId: string | null;
  currentBillAmount?: number;
  currentBillReference?: string;
}

export function POComparisonDialog({
  open,
  onOpenChange,
  poMatch,
  projectId,
  vendorId,
  currentBillAmount,
  currentBillReference,
}: POComparisonDialogProps) {
  const { data: relatedBills, isLoading } = usePORelatedBills(
    poMatch?.po_id || null,
    projectId,
    vendorId,
    poMatch?.cost_code_id || null
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!poMatch) return null;

  const isOverBudget = poMatch.remaining < 0;
  const overAmount = Math.abs(poMatch.remaining);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Order: {poMatch.po_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cost Code */}
          <div className="text-sm text-muted-foreground">
            Cost Code: <span className="font-medium text-foreground">{poMatch.cost_code_display}</span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">PO Amount</div>
                <div className="text-xl font-bold mt-1">{formatCurrency(poMatch.po_amount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Billed to Date</div>
                <div className="text-xl font-bold mt-1">{formatCurrency(poMatch.total_billed)}</div>
              </CardContent>
            </Card>
            <Card className={isOverBudget ? 'border-destructive' : ''}>
              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {isOverBudget ? 'Over Budget' : 'Remaining'}
                </div>
                <div className={`text-xl font-bold mt-1 ${isOverBudget ? 'text-destructive' : 'text-green-600'}`}>
                  {isOverBudget ? `-${formatCurrency(overAmount)}` : formatCurrency(poMatch.remaining)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning Banner */}
          {isOverBudget && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Budget Exceeded</p>
                <p className="text-yellow-700">
                  Cumulative bills for this PO exceed the contracted amount by {formatCurrency(overAmount)}.
                </p>
              </div>
            </div>
          )}

          {/* Related Bills Table */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Related Bills</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table containerClassName="max-h-[200px] overflow-auto">
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    </>
                  ) : relatedBills && relatedBills.length > 0 ? (
                    relatedBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="text-xs">
                          {formatDisplayFromAny(bill.bill_date)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {bill.reference_number || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {formatCurrency(bill.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-xs">
                        No related bills found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Current Bill Info */}
          {currentBillAmount !== undefined && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Current Bill: </span>
              <span className="font-medium">{currentBillReference || 'No Reference'}</span>
              <span className="text-muted-foreground"> for </span>
              <span className="font-medium">{formatCurrency(currentBillAmount)}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
