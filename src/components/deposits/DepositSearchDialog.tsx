import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteButton } from "@/components/ui/delete-button";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface DepositLine {
  id: string;
  amount: number;
  lot_id?: string | null;
  project_lots?: {
    id: string;
    lot_name: string | null;
    lot_number: number | null;
  } | null;
}

interface DepositSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposits: any[];
  isLoading: boolean;
  isDateLocked: (date: string) => boolean;
  onDepositSelect: (deposit: any) => void;
  onDeleteDeposit: (depositId: string) => Promise<void>;
}

interface LotBreakdownItem {
  categoryName: string;
  lots: Array<{ name: string; amount: number }>;
}

const getLotAllocationData = (lines: DepositLine[] | undefined) => {
  if (!lines || lines.length === 0) {
    return { display: '-', breakdown: [], totalAmount: 0, count: 0 };
  }

  // Group lines by lot
  const lotMap = new Map<string, { name: string; amount: number }>();
  let totalAmount = 0;

  for (const line of lines) {
    const amount = line.amount || 0;
    if (amount === 0) continue;
    
    totalAmount += amount;
    
    const lotInfo = line.project_lots;
    if (!lotInfo) continue;
    
    const lotId = lotInfo.id;
    const lotName = lotInfo.lot_name || `Lot ${lotInfo.lot_number}` || 'Unknown Lot';
    
    if (!lotMap.has(lotId)) {
      lotMap.set(lotId, { name: lotName, amount: 0 });
    }
    lotMap.get(lotId)!.amount += amount;
  }

  const count = lotMap.size;
  
  if (count === 0) {
    return { display: '-', breakdown: [], totalAmount, count: 0 };
  }

  // Build breakdown for tooltip
  const breakdown: LotBreakdownItem[] = [{
    categoryName: 'Lot Allocation',
    lots: Array.from(lotMap.values())
  }];

  // Determine display
  if (count === 1) {
    const firstLot = Array.from(lotMap.values())[0];
    return { display: firstLot.name, breakdown, totalAmount, count };
  }

  return { display: `+${count}`, breakdown, totalAmount, count };
};

export function DepositSearchDialog({
  open,
  onOpenChange,
  deposits,
  isLoading,
  isDateLocked,
  onDepositSelect,
  onDeleteDeposit,
}: DepositSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter deposits based on search query
  const filteredDeposits = useMemo(() => {
    if (!searchQuery.trim()) return deposits;
    
    const query = searchQuery.toLowerCase();
    return deposits.filter(deposit => {
      const dateStr = format(new Date(deposit.deposit_date + 'T00:00:00'), 'MM/dd/yyyy');
      const memo = (deposit.memo || '').toLowerCase();
      const companyName = (deposit.companies?.company_name || '').toLowerCase();
      
      return dateStr.includes(query) || memo.includes(query) || companyName.includes(query);
    });
  }, [deposits, searchQuery]);

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
    return filteredDeposits.map(deposit => {
      balance += deposit.amount; // Deposits increase balance
      return { ...deposit, balance };
    });
  };

  const handleDelete = async (depositId: string, deposit: any) => {
    // Check if reconciled
    if (deposit.reconciled || deposit.reconciliation_id || deposit.reconciliation_date) {
      toast({
        title: "Cannot Delete",
        description: "This deposit is reconciled and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // Check if in closed period
    if (isDateLocked(deposit.deposit_date)) {
      toast({
        title: "Cannot Delete",
        description: "This deposit is in a closed accounting period and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    await onDeleteDeposit(depositId);
  };

  const depositsWithBalance = calculateRunningBalance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Search Deposits</DialogTitle>
        </DialogHeader>
        
        {/* Search Input Box */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search deposits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              autoFocus={false}
            />
          </div>
        </div>
        
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
                  <TableHead className="h-8 px-2 py-1 text-xs">Date</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Received From</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Description</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Address</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-right">Amount</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-right">Balance</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Cleared</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositsWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No deposits match your search.' : 'No deposits found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  depositsWithBalance.map((deposit) => {
                    const isLocked = isDateLocked(deposit.deposit_date) || deposit.reversed_at;
                    const isReconciled = deposit.reconciled || !!deposit.reconciliation_id || !!deposit.reconciliation_date;
                    const { display, breakdown, totalAmount, count } = getLotAllocationData(deposit.deposit_lines);
                    
                    return (
                      <TableRow
                        key={deposit.id}
                        className="h-8 cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          onDepositSelect(deposit);
                          onOpenChange(false);
                        }}
                      >
                        <TableCell className="px-2 py-1 text-xs">
                          {format(new Date(deposit.deposit_date + 'T00:00:00'), 'MM/dd/yyyy')}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">
                          {deposit.companies?.company_name || 'Cash'}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">{deposit.memo || ''}</TableCell>
                        <TableCell className="px-2 py-1 text-xs">
                          {count <= 1 ? (
                            display
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="cursor-default underline decoration-dotted">
                                  {display}
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-2">
                                    {breakdown.map((cc, i) => (
                                      <div key={i}>
                                        <div className="pl-2 space-y-0.5">
                                          {cc.lots.map((lot, j) => (
                                            <div key={j} className="flex justify-between gap-4 text-xs">
                                              <span className="text-muted-foreground">{lot.name}:</span>
                                              <span>{formatCurrency(lot.amount)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                    <div className="border-t pt-1 flex justify-between font-medium text-xs">
                                      <span>Total:</span>
                                      <span>{formatCurrency(totalAmount)}</span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs text-right">
                          {formatCurrency(deposit.amount)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs text-right">
                          {formatCurrency(deposit.balance)}
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
                                    <p>This deposit is locked and cannot be deleted</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DeleteButton
                                onDelete={() => handleDelete(deposit.id, deposit)}
                                title="Delete Deposit"
                                description="Are you sure you want to delete this deposit? This action cannot be undone."
                                size="sm"
                                variant="ghost"
                                showIcon={true}
                                className="h-6 w-6 p-0"
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
