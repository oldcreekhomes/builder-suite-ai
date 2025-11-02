import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface JobCostActualDialogProps {
  isOpen: boolean;
  onClose: () => void;
  costCode: string;
  costCodeName: string;
  projectId: string;
  totalActual: number;
  asOfDate: Date;
}

interface JournalEntryLine {
  id: string;
  debit: number;
  credit: number;
  memo: string | null;
  journal_entries: {
    entry_date: string;
    description: string | null;
  };
}

export function JobCostActualDialog({
  isOpen,
  onClose,
  costCode,
  costCodeName,
  projectId,
  totalActual,
  asOfDate,
}: JobCostActualDialogProps) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: journalLines, isLoading } = useQuery({
    queryKey: ['job-cost-actual-details', projectId, costCode, asOfDate],
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

      // Get journal entry lines
      const { data: lines, error: linesError } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          debit,
          credit,
          memo,
          journal_entries!inner(
            entry_date,
            description
          )
        `)
        .eq('account_id', settings.wip_account_id)
        .eq('project_id', projectId)
        .eq('cost_code_id', costCodeData.id)
        .lte('journal_entries.entry_date', format(asOfDate, 'yyyy-MM-dd'))
        .order('journal_entries(entry_date)', { ascending: false });

      if (linesError) throw linesError;
      return (lines as unknown as JournalEntryLine[]) || [];
    },
    enabled: isOpen && !!projectId && !!costCode && !!userId,
  });

  const formatCurrency = (value: number) => {
    return `$${Math.round(value).toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Actual Costs - {costCode} {costCodeName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            As of {format(asOfDate, 'MMM d, yyyy')}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : journalLines && journalLines.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
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
                        <TableCell className="text-sm">
                          {line.memo || line.journal_entries.description || '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </TableCell>
                        <TableCell className={`text-right text-sm font-medium ${
                          netAmount >= 0 ? 'text-foreground' : 'text-red-600'
                        }`}>
                          {formatCurrency(netAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Total Row */}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell colSpan={4}>Total Actual</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActual)}</TableCell>
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
  );
}
