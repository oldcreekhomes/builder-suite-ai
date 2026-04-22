import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { formatDateSafe } from "@/utils/dateOnly";
import { useAuth } from "@/hooks/useAuth";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { ArrowUpDown, Check, Lock } from "lucide-react";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { useState, useMemo } from "react";
import { EditBillDialog } from "@/components/bills/EditBillDialog";
import { EditDepositDialog } from "@/components/deposits/EditDepositDialog";
import { EditCheckDialog } from "@/components/checks/EditCheckDialog";
import { useChecks } from "@/hooks/useChecks";
import { toast } from "@/hooks/use-toast";
import { BillFilesCell } from "@/components/bills/BillFilesCell";

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
  deposit_id?: string;
  check_id?: string;
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
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const [descriptionSort, setDescriptionSort] = useState<'asc' | 'desc' | null>(null);
  const { isDateLocked } = useClosedPeriodCheck(projectId);
  const { deleteCheck } = useChecks();

  const { data: journalLines, isLoading } = useQuery({
    queryKey: ['job-cost-actual-details', projectId, costCode, asOfDate, lotId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      // Get effective owner ID from session metadata first (fastest)
      // For employees (user_type=employee), use their home_builder_id
      const meta = session?.user?.user_metadata;
      let effectiveOwnerId = userId;
      
      if (meta?.user_type === 'employee' && meta?.home_builder_id) {
        effectiveOwnerId = meta.home_builder_id;
      } else {
        // Fallback: query users table if metadata incomplete
        const { data: userData } = await supabase
          .from('users')
          .select('home_builder_id')
          .eq('id', userId)
          .single();
        
        if (userData?.home_builder_id) {
          effectiveOwnerId = userData.home_builder_id;
        }
      }

      // First get WIP account ID
      const { data: settings, error: settingsError } = await supabase
        .from('accounting_settings')
        .select('wip_account_id')
        .eq('owner_id', effectiveOwnerId)
        .single();

      if (settingsError) throw settingsError;
      if (!settings?.wip_account_id) throw new Error("WIP account not configured");

      // Get cost code ID
      const { data: costCodeData, error: costCodeError } = await supabase
        .from('cost_codes')
        .select('id')
        .eq('code', costCode)
        .eq('owner_id', effectiveOwnerId)
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

      // Enrich bill entries with vendor and reference info
      let billsMap = new Map<string, { reference_number: string | null; vendor_name: string | null; reconciled: boolean | null; attachments: any[] }>();
      if (billSourceIds.length > 0) {
        const { data: billsData } = await supabase
          .from('bills')
          .select(`
            id,
            reference_number,
            reconciled,
            vendor_id,
            companies!bills_vendor_id_fkey(company_name),
            bill_attachments(id, file_path, file_name, file_size, content_type)
          `)
          .in('id', billSourceIds);

        billsMap = new Map(
          billsData?.map(bill => [
            bill.id,
            {
              reference_number: bill.reference_number,
              vendor_name: (bill.companies as any)?.company_name,
              reconciled: bill.reconciled,
              attachments: (bill as any).bill_attachments || []
            }
          ]) || []
        );
      }

      // Enrich check entries with payee name and reconciled status
      const checkSourceIds = rawLines
        .filter(line => line.journal_entries.source_type === 'check')
        .map(line => line.journal_entries.source_id)
        .filter((id): id is string => id !== null);

      let checksMap = new Map<string, { pay_to: string; reconciled: boolean }>();
      if (checkSourceIds.length > 0) {
        const { data: checksData } = await supabase
          .from('checks')
          .select('id, pay_to, reconciled')
          .in('id', checkSourceIds);

        checksMap = new Map(
          checksData?.map(check => [
            check.id,
            {
              pay_to: check.pay_to,
              reconciled: check.reconciled
            }
          ]) || []
        );
      }

      // Enrich deposit entries with company name and reconciled status
      const depositSourceIds = rawLines
        .filter(line => line.journal_entries.source_type === 'deposit')
        .map(line => line.journal_entries.source_id)
        .filter((id): id is string => id !== null);

      let depositsMap = new Map<string, { company_name: string | null; reconciled: boolean | null }>();
      if (depositSourceIds.length > 0) {
        const { data: depositsData } = await supabase
          .from('deposits')
          .select('id, reconciled, company_id, companies!deposits_company_id_fkey(company_name)')
          .in('id', depositSourceIds);

        depositsMap = new Map(
          depositsData?.map(dep => [
            dep.id,
            {
              company_name: (dep.companies as any)?.company_name ?? null,
              reconciled: dep.reconciled
            }
          ]) || []
        );
      }

      // Map all lines with enriched data
      return rawLines.map(line => {
        const sourceType = line.journal_entries.source_type;
        const sourceId = line.journal_entries.source_id || '';
        
        let vendor_name: string | undefined;
        let reconciled = line.reconciled;
        let reference_number: string | undefined;
        let bill_id: string | undefined;
        let deposit_id: string | undefined;
        let check_id: string | undefined;
        let attachments: any[] = [];

        if (sourceType === 'bill') {
          const billData = billsMap.get(sourceId);
          vendor_name = billData?.vendor_name ?? undefined;
          reference_number = billData?.reference_number ?? undefined;
          reconciled = billData?.reconciled ?? line.reconciled;
          bill_id = sourceId;
          attachments = billData?.attachments || [];
        } else if (sourceType === 'check') {
          const checkData = checksMap.get(sourceId);
          vendor_name = checkData?.pay_to;
          reconciled = checkData?.reconciled ?? line.reconciled;
          check_id = sourceId;
        } else if (sourceType === 'deposit') {
          const depData = depositsMap.get(sourceId);
          vendor_name = depData?.company_name ?? undefined;
          reconciled = depData?.reconciled ?? line.reconciled;
          deposit_id = sourceId;
        }

        return {
          ...line,
          source_type: sourceType || 'unknown',
          bill_id,
          deposit_id,
          check_id,
          vendor_name,
          reference_number,
          reconciled,
          attachments,
        };
      });
    },
    enabled: isOpen && !!projectId && !!costCode && !!userId,
  });

  // Sort journal lines by description if sort is active
  const sortedLines = useMemo(() => {
    if (!journalLines || !descriptionSort) return journalLines;
    
    return [...journalLines].sort((a, b) => {
      const descA = (a.memo || a.journal_entries.description || '').toLowerCase();
      const descB = (b.memo || b.journal_entries.description || '').toLowerCase();
      
      if (descriptionSort === 'asc') {
        return descA.localeCompare(descB);
      } else {
        return descB.localeCompare(descA);
      }
    });
  }, [journalLines, descriptionSort]);

  // Calculate running balances
  const { balances, total } = useMemo(() => {
    if (!sortedLines) return { balances: [], total: 0 };
    
    let runningBalance = 0;
    const balances = sortedLines.map(line => {
      const netAmount = line.debit - line.credit;
      runningBalance += netAmount;
      return runningBalance;
    });
    
    return { balances, total: runningBalance };
  }, [sortedLines]);

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

  const handleEditDeposit = (depositId: string) => {
    setEditingDepositId(depositId);
  };

  const handleEditCheck = (checkId: string) => {
    setEditingCheckId(checkId);
  };

  const handleEditDialogClose = () => {
    setEditingBillId(null);
    queryClient.invalidateQueries({ queryKey: ['job-cost-actual-details', projectId, costCode] });
  };

  const handleEditDepositDialogClose = () => {
    setEditingDepositId(null);
    queryClient.invalidateQueries({ queryKey: ['job-cost-actual-details', projectId, costCode] });
  };

  const handleEditCheckDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCheckId(null);
      queryClient.invalidateQueries({ queryKey: ['job-cost-actual-details', projectId, costCode] });
    }
  };

  const invalidateAfterDelete = () => {
    queryClient.invalidateQueries({ queryKey: ['job-cost-actual-details'] });
    queryClient.invalidateQueries({ queryKey: ['job-costs'] });
    queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    queryClient.invalidateQueries({ queryKey: ['income-statement'] });
    queryClient.invalidateQueries({ queryKey: ['account-transactions'] });
    queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
    queryClient.invalidateQueries({ queryKey: ['bill-approval-counts'] });
  };

  const handleDeleteTransaction = async (line: any) => {
    try {
      if (line.bill_id) {
        const { error } = await supabase.rpc('delete_bill_with_journal_entries', {
          bill_id_param: line.bill_id,
        });
        if (error) throw error;
        toast({ title: "Bill deleted", description: "The bill and its journal entries have been removed." });
      } else if (line.deposit_id) {
        const { error } = await supabase.rpc('delete_deposit_with_journal_entries', {
          deposit_id_param: line.deposit_id,
        });
        if (error) throw error;
        toast({ title: "Deposit deleted", description: "The deposit and its journal entries have been removed." });
      } else if (line.check_id) {
        await deleteCheck.mutateAsync(line.check_id);
        toast({ title: "Check deleted", description: "The check and its journal entries have been removed." });
      }
      invalidateAfterDelete();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    }
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
              <Table className="text-xs table-fixed" containerClassName="relative w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[7%]">Type</TableHead>
                    <TableHead className="w-[9%]">Date</TableHead>
                    <TableHead className="w-[18%]">Name</TableHead>
                    <TableHead className="w-[28%]">
                      <button 
                        className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors"
                        onClick={() => setDescriptionSort(prev => 
                          prev === null ? 'asc' : prev === 'asc' ? 'desc' : null
                        )}
                      >
                        Description
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[8%]">Files</TableHead>
                    <TableHead className="w-[10%] text-right">Amount</TableHead>
                    <TableHead className="w-[10%] text-right">Balance</TableHead>
                    <TableHead className="w-[5%] text-center">Cleared</TableHead>
                    <TableHead className="w-[5%] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLines?.map((line, index) => {
                    const netAmount = line.debit - line.credit;
                    
                    return (
                      <TableRow key={line.id} className="whitespace-nowrap">
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs">{getTypeLabel(line.source_type)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{formatDateSafe(line.journal_entries.entry_date, 'MM/dd/yyyy')}</span>
                        </TableCell>
                        <TableCell className="max-w-0 truncate">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs truncate block">{line.vendor_name || '-'}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start">
                              {line.vendor_name || '-'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-0 truncate">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs truncate block">{line.memo || line.journal_entries.description || '-'}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start">
                              {line.memo || line.journal_entries.description || '-'}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="py-0">
                          {line.bill_id && (line as any).attachments?.length > 0 ? (
                            <div className="h-4 leading-none flex items-center">
                              <BillFilesCell attachments={(line as any).attachments} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs">{formatCurrency(netAmount)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs">{formatCurrency(balances[index])}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center">
                            {line.reconciled && <Check className="h-4 w-4 text-green-600 mx-auto" />}
                          </div>
                        </TableCell>
                        <TableCell>
                        <div className="flex items-center justify-center">
                            {line.reconciled || isDateLocked(line.journal_entries.entry_date) ? (
                              <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="flex justify-center">
                                    <Lock className="h-4 w-4 text-red-600" />
                                  </div>
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
                            ) : (line.bill_id || line.deposit_id || line.check_id) ? (
                              <TableRowActions actions={[
                                ...(line.bill_id ? [{ label: "Edit Bill", onClick: () => handleEditBill(line.bill_id!) }] : []),
                                ...(line.deposit_id ? [{ label: "Edit Deposit", onClick: () => handleEditDeposit(line.deposit_id!) }] : []),
                                ...(line.check_id ? [{ label: "Edit Check", onClick: () => handleEditCheck(line.check_id!) }] : []),
                                {
                                  label: "Delete",
                                  variant: 'destructive' as const,
                                  onClick: () => handleDeleteTransaction(line),
                                  requiresConfirmation: true,
                                  confirmTitle: line.bill_id
                                    ? "Delete this bill?"
                                    : line.deposit_id
                                    ? "Delete this deposit?"
                                    : "Delete this check?",
                                  confirmDescription: line.bill_id
                                    ? "This will permanently delete this bill and all of its journal entries. This action cannot be undone."
                                    : line.deposit_id
                                    ? "This will permanently delete this deposit and all of its journal entries. This action cannot be undone."
                                    : "This will permanently delete this check and all of its journal entries. This action cannot be undone.",
                                },
                              ]} />
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Total Row */}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell colSpan={5}>
                      <span className="text-xs font-semibold">Total</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-semibold">{formatCurrency(total)}</span>
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
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

      {/* Edit Deposit Dialog */}
      <EditDepositDialog
        open={!!editingDepositId}
        onOpenChange={handleEditDepositDialogClose}
        depositId={editingDepositId || ''}
      />

      {/* Edit Check Dialog */}
      <EditCheckDialog
        open={!!editingCheckId}
        onOpenChange={handleEditCheckDialogClose}
        checkId={editingCheckId || ''}
      />
    </>
  );
}
