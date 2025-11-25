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

interface CreditCardSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCards: any[];
  isLoading: boolean;
  isDateLocked: (date: string) => boolean;
  onCreditCardSelect: (creditCard: any) => void;
  onDeleteCreditCard: (creditCardId: string) => Promise<void>;
}

export function CreditCardSearchDialog({
  open,
  onOpenChange,
  creditCards,
  isLoading,
  isDateLocked,
  onCreditCardSelect,
  onDeleteCreditCard,
}: CreditCardSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter credit cards based on search query
  const filteredCreditCards = useMemo(() => {
    if (!searchQuery.trim()) return creditCards;
    
    const query = searchQuery.toLowerCase();
    return creditCards.filter(cc => {
      const dateStr = format(new Date(cc.transaction_date + 'T00:00:00'), 'MM/dd/yyyy');
      const vendor = (cc.vendor || '').toLowerCase();
      const memo = (cc.memo || '').toLowerCase();
      
      return dateStr.includes(query) || vendor.includes(query) || memo.includes(query);
    });
  }, [creditCards, searchQuery]);

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
    return filteredCreditCards.map(cc => {
      // Purchases increase balance (credit card liability), refunds decrease it
      if (cc.transaction_type === 'purchase') {
        balance += cc.amount;
      } else {
        balance -= cc.amount;
      }
      return { ...cc, balance };
    });
  };

  const handleDelete = async (creditCardId: string, creditCard: any) => {
    // Check if reconciled
    if (creditCard.reconciled || creditCard.reconciliation_id || creditCard.reconciliation_date) {
      toast({
        title: "Cannot Delete",
        description: "This credit card transaction is reconciled and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    // Check if in closed period
    if (isDateLocked(creditCard.transaction_date)) {
      toast({
        title: "Cannot Delete",
        description: "This credit card transaction is in a closed accounting period and cannot be deleted.",
        variant: "destructive",
      });
      return;
    }

    await onDeleteCreditCard(creditCardId);
  };

  const creditCardsWithBalance = calculateRunningBalance();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Search Credit Card Transactions</DialogTitle>
        </DialogHeader>
        
        {/* Search Input Box */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
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
                  <TableHead className="h-8 px-2 py-1 text-xs">Vendor</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs">Description</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-right">Amount</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-right">Balance</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Cleared</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditCardsWithBalance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No credit card transactions match your search.' : 'No credit card transactions found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  creditCardsWithBalance.map((cc) => {
                    const isLocked = isDateLocked(cc.transaction_date) || cc.reversed_at;
                    const isReconciled = cc.reconciled || !!cc.reconciliation_id || !!cc.reconciliation_date;
                    
                    return (
                      <TableRow
                        key={cc.id}
                        className="h-8 cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          onCreditCardSelect(cc);
                          onOpenChange(false);
                        }}
                      >
                        <TableCell className="px-2 py-1 text-xs">
                          {format(new Date(cc.transaction_date + 'T00:00:00'), 'MM/dd/yyyy')}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs">{cc.vendor}</TableCell>
                        <TableCell className="px-2 py-1 text-xs">{cc.memo || ''}</TableCell>
                        <TableCell className="px-2 py-1 text-xs text-right">
                          {formatCurrency(-cc.amount)}
                        </TableCell>
                        <TableCell className="px-2 py-1 text-xs text-right">
                          {formatCurrency(cc.balance)}
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
                                    <p>This credit card transaction is locked and cannot be deleted</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DeleteButton
                                onDelete={() => handleDelete(cc.id, cc)}
                                title="Delete Credit Card Transaction"
                                description="Are you sure you want to delete this credit card transaction? This action cannot be undone."
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
