import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateBudgetItemTotal } from "@/utils/budgetUtils";

interface JobCostBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: string;
  costCodeName: string;
  projectId: string;
  totalBudget: number;
}

export function JobCostBudgetDialog({
  isOpen,
  onClose,
  costCode,
  costCodeName,
  projectId,
  totalBudget,
}: JobCostBudgetDialogProps) {
  const { data: budgetItems, isLoading } = useQuery({
    queryKey: ['job-cost-budget-details', projectId, costCode],
    queryFn: async () => {
      const { data: items, error } = await supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes!inner(code, name),
          selected_bid:selected_bid_id(
            id,
            price,
            companies(company_name)
          )
        `)
        .eq('project_id', projectId)
        .eq('cost_codes.code', costCode);

      if (error) throw error;
      return items || [];
    },
    enabled: isOpen && !!projectId && !!costCode,
  });

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0';
    return `$${Math.round(value).toLocaleString()}`;
  };

  const getBudgetSourceLabel = (item: any) => {
    const source = item.budget_source;
    if (!source) return 'Manual';
    
    switch (source) {
      case 'vendor-bid':
        return 'Vendor Bid';
      case 'estimate':
        return 'Estimate';
      case 'historical':
        return 'Historical';
      case 'settings':
        return 'Settings';
      case 'manual':
        return 'Manual';
      default:
        return source;
    }
  };

  const formatUnitOfMeasure = (unit: string | null | undefined) => {
    if (!unit) return '';
    const unitMap: Record<string, string> = {
      'square-feet': 'SF',
      'linear-feet': 'LF',
      'cubic-yard': 'CY',
      'square-yard': 'SY',
      'lump-sum': 'LS',
      'each': 'EA',
      'hour': 'HR',
      'month': 'MO'
    };
    return unitMap[unit] || unit;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Budget Details - {costCode} {costCodeName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : budgetItems && budgetItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-center">Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetItems.map((item) => {
                    const selectedBid = item.selected_bid as any;
                    const hasSelectedBid = !!item.selected_bid_id && selectedBid;
                    const bidCompanyName = hasSelectedBid ? (selectedBid.companies?.company_name || 'Unknown') : '';
                    
                    // Calculate total for this item
                    const itemTotal = calculateBudgetItemTotal(item, 0, false);
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">
                          <div>{getBudgetSourceLabel(item)}</div>
                          {hasSelectedBid && (
                            <div className="text-xs text-muted-foreground">{bidCompanyName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {item.quantity || '-'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {formatUnitOfMeasure((item.cost_codes as any)?.unit_of_measure)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(itemTotal)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Total Row */}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell colSpan={4}>Total Budget</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalBudget)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No budget data available for this cost code.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
