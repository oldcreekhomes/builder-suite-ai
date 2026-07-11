import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDateSafe } from "@/utils/dateOnly";
import { ReconciliationReviewDialog } from "@/components/transactions/ReconciliationReviewDialog";


interface BankReconciliationsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BankReconciliationRow {
  id: string;
  bank_account_id: string;
  statement_date: string;
  statement_beginning_balance: number;
  statement_ending_balance: number;
  reconciled_balance: number;
  difference: number;
  status: 'in_progress' | 'completed';
  completed_at: string | null;
  updated_at: string;
  notes: string | null;
}

export function BankReconciliationsDialog({ projectId, open, onOpenChange }: BankReconciliationsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bank Reconciliations</DialogTitle>
        </DialogHeader>
        <BankReconciliationsDialogContent projectId={projectId} />
      </DialogContent>
    </Dialog>
  );
}

function BankReconciliationsDialogContent({ projectId }: { projectId: string }) {
  const [selectedReconciliation, setSelectedReconciliation] = useState<BankReconciliationRow | null>(null);

  // Fetch actual bank reconciliations created from the ledger.
  const { data: reconciliations, isLoading } = useQuery({
    queryKey: ['bank-reconciliations', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_reconciliations')
        .select('id, bank_account_id, statement_date, statement_beginning_balance, statement_ending_balance, reconciled_balance, difference, status, completed_at, updated_at, notes')
        .eq('project_id', projectId)
        .order('statement_date', { ascending: false });

      if (error) throw error;
      return (data || []) as BankReconciliationRow[];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {reconciliations?.length || 0} reconciliation(s)
      </p>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : reconciliations && reconciliations.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">Statement Date</th>
                <th className="text-right p-3 font-medium">Beginning Balance</th>
                <th className="text-right p-3 font-medium">Ending Balance</th>
                <th className="text-right p-3 font-medium">Difference</th>
                <th className="text-right p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Completed / Updated</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((reconciliation) => (
                <tr key={reconciliation.id} className="border-t hover:bg-muted/50">
                  <td className="p-3">
                    {formatDateSafe(reconciliation.statement_date, 'MM/dd/yyyy')}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(reconciliation.statement_beginning_balance)}
                  </td>
                  <td className="p-3 text-right">
                    {formatCurrency(reconciliation.statement_ending_balance)}
                  </td>
                  <td className="p-3 text-right">
                    <span className={Math.abs(reconciliation.difference || 0) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(reconciliation.difference)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={reconciliation.status === 'completed' ? 'default' : 'secondary'}>
                      {reconciliation.status === 'completed' ? 'Completed' : 'In Progress'}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {reconciliation.completed_at
                      ? format(new Date(reconciliation.completed_at), 'MM/dd/yyyy')
                      : format(new Date(reconciliation.updated_at), 'MM/dd/yyyy')}
                  </td>
                  <td className="p-3 text-center">
                    <TableRowActions actions={[
                      {
                        label: "Review",
                        onClick: () => setSelectedReconciliation(reconciliation),
                      },
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No bank reconciliations yet
        </div>
      )}

      <ReconciliationReviewDialog
        open={!!selectedReconciliation}
        onOpenChange={(open) => !open && setSelectedReconciliation(null)}
        reconciliation={selectedReconciliation}
        bankAccountId={selectedReconciliation?.bank_account_id || null}
      />
    </div>
  );
}
