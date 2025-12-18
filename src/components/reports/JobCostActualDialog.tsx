import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
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
        .is('journal_entries.reversed_at', null)
        .lte('journal_entries.entry_date', asOfDate.toISOString().split('T')[0]);

      // Include both matching lot_id AND null lot_id (for historical data entered before lot allocation)
      if (lotId) {
        query = query.or(`lot_id.eq.${lotId},lot_id.is.null`);
      }

      const { data: lines, error: linesError } = await query.order('journal_entries(entry_date)', { ascending: false });

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

  // Calculate total from actual filtered lines instead of prop
  const calculatedTotal = useMemo(() => {
    if (!journalLines) return 0;
    return journalLines.reduce((sum, line) => sum + (line.debit - line.credit), 0);
  }, [journalLines]);

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`;
  };

  const getTypeLabel = (sourceType: string | undefined) => {
    switch (sourceType) {
      case 'bill': return 'Bill';
      case 'check': return 'Check';
      case 'manual': return 'JE';
      case 'credit_card': return 'CC';
      case 'deposit': return 'Dep';
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
              Actual Costs - {costCode} {costCodeName}
            </DialogTitle>
            <div className="text-sm text-muted-foreground">
              As of {format(asOfDate, 'MMM d, yyyy')}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-0">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : journalLines && journalLines.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">Date</TableHead>
                      <TableHead className="w-[50px]">Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Ref #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right w-[100px]">Net Amount</TableHead>
                      <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journalLines.map((line) => {
                      const netAmount = line.debit - line.credit;
                      
                      return (
                        <TableRow key={line.id}>
                          <TableCell className="text-sm">
                            {format(new Date(line.journal_entries.entry_date), 'MM/dd/yyyy')}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {getTypeLabel(line.source_type)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {line.vendor_name || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {line.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {line.memo || line.journal_entries.description || '-'}
                          </TableCell>
                          <TableCell className={`text-right text-sm font-medium ${
                            netAmount >= 0 ? 'text-foreground' : 'text-red-600'
                          }`}>
                            {formatCurrency(netAmount)}
                          </TableCell>
                          <TableCell>
                            {line.bill_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditBill(line.bill_id!)}
                                title="Edit Bill"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    
                    {/* Total Row */}
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell colSpan={5}>Total Actual</TableCell>
                      <TableCell className="text-right">{formatCurrency(calculatedTotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
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
