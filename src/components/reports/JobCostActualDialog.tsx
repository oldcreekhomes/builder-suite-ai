import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { Button } from "@/components/ui/button";
import { Check, Lock, Pencil } from "lucide-react";
import { useState, useMemo } from "react";
import { EditBillDialog } from "@/components/bills/EditBillDialog";

interface JobCostActualDialogProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: string;
  costCodeName: string;
  projectId: string;
  totalActual: number;
  asOfDate: Date;
  lotId?: string | null;
}

interface JournalEntryLine {
  id: string;
  debit: number;
  credit: number;
  memo: string | null;
  is_reversal: boolean;
  reconciled: boolean | null;
  journal_entries: {
    entry_date: string;
    description: string | null;
    source_type: string | null;
    source_id: string | null;
    reversed_at: string | null;
  };
  // Enriched from bill lookup
  vendor_name?: string;
  reference_number?: string;
  bill_id?: string;
  source_type?: string;
}

export function JobCostActualDialog({
  isOpen,
  onClose,
  costCode,
  costCodeName,
  projectId,
  totalActual,
  asOfDate,
  lotId,
}: JobCostActualDialogProps) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const { isDateLocked } = useClosedPeriodCheck(projectId);

  const { data: journalLines, isLoading } = useQuery({
    queryKey: ['job-cost-actual-details', projectId, costCode, asOfDate, lotId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      // First get WIP account ID
      const { data: settings, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('wip_account_id')
        .eq('owner_id', userId)
        .single();

      if (settingsError) throw settingsError;
      if (!settings?.wip_account_id) throw new Error("WIP account not configured");

      // Get cost code ID
      const { data: costCodeData, error: costCodeError } = await supabase
        .from('cost_codes')
        .select('id')
        .eq('code', costCode)
        .eq('owner_id', userId)
        .single();

      if (costCodeError) throw costCodeError;
      if (!costCodeData) throw new Error("Cost code not found");

      // Get journal entry lines with source info - exclude reversals and reversed entries
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          memo,
          is_reversal,
          reconciled,
          journal_entries!inner(
            entry_date,
            description,
            source_type,
            source_id,
            reversed_at
          )
        `)
        .eq('account_id', settings.wip_account_id)
        .eq('project_id', projectId)
        .eq('cost_code_id', costCodeData.id)
        .eq('is_reversal', false)
        .is('journal_entries.reversed_by_id', null)
        .lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);

      // Include both matching lot_id AND null lot_id (for historical data entered before lot allocation)
      if (lotId) {
        query = query.or(`lot_id.eq.${lotId},lot_id.is.null`);
      }

      const { data: lines, error: linesError } = await query.order('journal_entries(entry_date)', { ascending: true });

      if (linesError) throw linesError;
      
      const rawLines = (lines as unknown as JournalEntryLine[]) || [];
      
      // Enrich bill entries with vendor and reference info
      const billSourceIds = rawLines
        .filter(line => line.journal_entries.source_type === 'bill')
        .map(line => line.journal_entries.source_id)
        .filter((id): id is string => id !== null);

      if (billSourceIds.length > 0) {
        const { data: billsData } = await supabase
          .from('bills')
          .select(`
            id,
            reference_number,
            vendor_id,
            companies!bills_vendor_id_fkey(company_name)
          `)
          .in('id', billSourceIds);

        const billsMap = new Map(
          billsData?.map(bill => [
            bill.id,
            {
              reference_number: bill.reference_number,
              vendor_name: (bill.companies as any)?.company_name
            }
          ]) || []
        );

        return rawLines.map(line => ({
          ...line,
          source_type: line.journal_entries.source_type || 'unknown',
          bill_id: line.journal_entries.source_type === 'bill' ? line.journal_entries.source_id : undefined,
          vendor_name: line.journal_entries.source_type === 'bill' 
            ? billsMap.get(line.journal_entries.source_id || '')?.vendor_name 
            : undefined,
          reference_number: line.journal_entries.source_type === 'bill'
            ? billsMap.get(line.journal_entries.source_id || '')?.reference_number
            : undefined,
        }));
      }

      return rawLines.map(line => ({
        ...line,
        source_type: line.journal_entries.source_type || 'unknown',
      }));
    },
    enabled: isOpen && !!projectId && !!costCode && !!userId,
  });

  // Calculate running balances
  const { balances, total } = useMemo(() => {
    if (!journalLines) return { balances: [], total: 0 };
    
    let runningBalance = 0;
    const balances = journalLines.map(line => {
      const netAmount = line.debit - line.credit;
      runningBalance += netAmount;
      return runningBalance;
    });
    
    return { balances, total: runningBalance };
  }, [journalLines]);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
};

  const getTypeLabel = (sourceType: string | undefined) => {
    switch (sourceType) {
      case 'bill': return 'Bill';
      case 'check': return 'Check';
      case 'manual': return 'Journal Entry';
      case 'credit_card': return 'Credit Card';
      case 'deposit': return 'Deposit';
      default: return sourceType || '-';
    }
  };

  const handleEditBill = (billId: string) => {
    setEditingBillId(billId);
  };

  const handleEditDialogClose = () => {
    setEditingBillId(null);
    // Refresh data after edit
    queryClient.invalidateQueries({ queryKey: ['job-cost-actual-details', projectId, costCode] });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {costCode} - {costCodeName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : journalLines && journalLines.length > 0 ? (
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="h-8 px-2 py-1">Type</TableHead>
                    <TableHead className="h-8 px-2 py-1">Date</TableHead>
                    <TableHead className="h-8 px-2 py-1">Name</TableHead>
                    <TableHead className="h-8 px-2 py-1">Description</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-right">Amount</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-right">Balance</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-center">Cleared</TableHead>
                    <TableHead className="h-8 px-2 py-1 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalLines.map((line, index) => {
                    const netAmount = line.debit - line.credit;
                    
                    return (
                      <TableRow key={line.id} className="h-8">
                        <TableCell className="px-2 py-1 whitespace-nowrap">
                          <span className="text-xs">{getTypeLabel(line.source_type)}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <span className="text-xs">{format(new Date(line.journal_entries.entry_date), 'MM/dd/yyyy')}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <span className="text-xs">{line.vendor_name || '-'}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <span className="text-xs">{line.memo || line.journal_entries.description || '-'}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          <span className="text-xs">{formatCurrency(netAmount)}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-right">
                          <span className="text-xs">{formatCurrency(balances[index])}</span>
                        </TableCell>
                        <TableCell className="px-2 py-1 text-center">
                          <div className="flex items-center justify-center">
                            {line.reconciled && <Check className="h-4 w-4 text-green-600 mx-auto" />}
                          </div>
                        </TableCell>
                        <TableCell className="px-2 py-1">
                          <div className="flex items-center justify-center">
                            {line.bill_id && !line.reconciled && !isDateLocked(line.journal_entries.entry_date) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleEditBill(line.bill_id!)}
                                title="Edit Bill"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {(line.reconciled || isDateLocked(line.journal_entries.entry_date)) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span><Lock className="h-3 w-3 text-muted-foreground" /></span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" align="center">
                                    {line.reconciled && isDateLocked(line.journal_entries.entry_date) ? (
                                      <>
                                        <p className="font-medium">Reconciled and Books Closed</p>
                                        <p className="text-xs text-muted-foreground">Cannot be edited or deleted</p>
                                      </>
                                    ) : line.reconciled ? (
                                      <>
                                        <p className="font-medium">Reconciled</p>
                                        <p className="text-xs text-muted-foreground">Cannot be edited or deleted</p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="font-medium">Books Closed</p>
                                        <p className="text-xs text-muted-foreground">Cannot be edited or deleted</p>
                                      </>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Total Row */}
                  <TableRow className="h-8 font-semibold bg-muted/30">
                    <TableCell className="px-2 py-1" colSpan={4}>
                      <span className="text-xs font-semibold">Total</span>
                    </TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <span className="text-xs font-semibold">{formatCurrency(total)}</span>
                    </TableCell>
                    <TableCell className="px-2 py-1"></TableCell>
                    <TableCell className="px-2 py-1"></TableCell>
                    <TableCell className="px-2 py-1"></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No actual cost data available for this cost code.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <EditBillDialog
        open={!!editingBillId}
        onOpenChange={handleEditDialogClose}
        billId={editingBillId || ''}
      />
    </>
  );
}
