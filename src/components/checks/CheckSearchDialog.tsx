import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteButton } from "@/components/ui/delete-button";
import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface CheckSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checks: any[];
  isLoading: boolean;
  isDateLocked: (date: string) => boolean;
  onCheckSelect: (check: any) => void;
  onDeleteCheck: (checkId: string) => Promise<void>;
}

export function CheckSearchDialog({
  open,
  onOpenChange,
  checks,
  isLoading,
  isDateLocked,
  onCheckSelect,
  onDeleteCheck,
}: CheckSearchDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateRunningBalance = () => {
    let balance = 0;
    return checks.map(check => {
      balance -= check.amount; // Checks decrease balance
      return { ...check, balance };
    });
  };

  const handleDelete = async (checkId: string, check: any) => {
    // Check if reconciled
    if (check.reconciled || check.reconciliation_id || check.reconciliation_date) {
      toast({
        title: "Cannot Delete",
        description: "This check is reconciled and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // Check if in closed period
    if (isDateLocked(check.check_date)) {
      toast({
        title: "Cannot Delete",
        description: "This check is in a closed accounting period and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    await onDeleteCheck(checkId);
  };

  const checksWithBalance = calculateRunningBalance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Checks</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table containerClassName="max-h-[calc(85vh-8rem)]">
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="px-2 py-1 text-xs">Date</TableHead>
                  <TableHead className="px-2 py-1 text-xs">Pay To</TableHead>
                  <TableHead className="px-2 py-1 text-xs">Description</TableHead>
                  <TableHead className="px-2 py-1 text-xs text-right">Amount</TableHead>
                  <TableHead className="px-2 py-1 text-xs text-right">Balance</TableHead>
                  <TableHead className="px-2 py-1 text-xs text-center">Cleared</TableHead>
                  <TableHead className="px-2 py-1 text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checksWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No checks found
                    </TableCell>
                  </TableRow>
                ) : (
                  checksWithBalance.map((check) => {
                    const isLocked = isDateLocked(check.check_date) || check.reversed_at;
                    const isReconciled = check.reconciled || !!check.reconciliation_id || !!check.reconciliation_date;
                    
                    return (
                      <TableRow
                        key={check.id}
                        className="h-8 cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          onCheckSelect(check);
                          onOpenChange(false);
                        }}
                      >
                        <TableCell className="px-2 py-1 text-xs">
                          {format(new Date(check.check_date + 'T00:00:00'), 'MM/dd/yyyy')}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">{check.pay_to}</TableCell>
                        <TableCell className="px-2 py-1 text-xs">{check.memo || ''}</TableCell>
                        <TableCell className="px-2 py-1 text-xs text-right">
                          {formatCurrency(check.amount)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs text-right">
                          {formatCurrency(check.balance)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          {isReconciled && (
                            <Check className="h-4 w-4 text-green-600 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {isLocked ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-base">🔒</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>This check is locked and cannot be deleted</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DeleteButton
                                onDelete={() => handleDelete(check.id, check)}
                                title="Delete Check"
                                description="Are you sure you want to delete this check? This action cannot be undone."
                                size="sm"
                                variant="ghost"
                                showIcon={true}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
