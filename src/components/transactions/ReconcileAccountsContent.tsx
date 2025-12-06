import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useProject } from "@/hooks/useProject";
import { useBankReconciliation } from "@/hooks/useBankReconciliation";
import { useUndoReconciliationPermissions } from "@/hooks/useUndoReconciliationPermissions";
import { format, addMonths, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, CheckCircle2, Lock, LockOpen, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineEditCell } from "@/components/schedule/InlineEditCell";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface ReconcileAccountsContentProps {
  projectId?: string;
}

export function ReconcileAccountsContent({ projectId }: ReconcileAccountsContentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project } = useProject(projectId!);
  const { accounts } = useAccounts();

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [statementDate, setStatementDate] = useState<Date>();
  const [hideTransactionsAfterDate, setHideTransactionsAfterDate] = useState<Date | undefined>();
  const [beginningBalance, setBeginningBalance] = useState<string>("");
  const [endingBalance, setEndingBalance] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(new Set());
  const [currentReconciliationId, setCurrentReconciliationId] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [lastCompletedDate, setLastCompletedDate] = useState<Date | null>(null);

  const { 
    useReconciliationTransactions,
    useReconciliationHistory,
    createReconciliation,
    updateReconciliation,
    markTransactionReconciled,
    updateCheckTransaction,
    updateDepositTransaction,
    updateBillPaymentTransaction,
    undoReconciliation,
  } = useBankReconciliation();
  
  const { canUndoReconciliation } = useUndoReconciliationPermissions();
  const { toast } = useToast();
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [selectedReconciliationToUndo, setSelectedReconciliationToUndo] = useState<any>(null);
  const [uncheckedWarningDialogOpen, setUncheckedWarningDialogOpen] = useState(false);
  const [uncheckedWarningMessage, setUncheckedWarningMessage] = useState("");

  const { 
    data: reconciliationHistory,
    isLoading: historyLoading 
  } = useReconciliationHistory(
    projectId || null,
    selectedBankAccountId
  );

  const { data: transactions, isLoading: transactionsLoading } = useReconciliationTransactions(
    projectId || null,
    selectedBankAccountId
  );

  const bankAccounts = accounts?.filter(
    (acc) => acc.type === 'asset' && acc.is_active
  ) || [];

  const clearedChecks = transactions?.checks.filter(c => checkedTransactions.has(c.id)) || [];
  const clearedDeposits = transactions?.deposits.filter(d => checkedTransactions.has(d.id)) || [];
  
  const totalClearedChecks = clearedChecks.reduce((sum, c) => sum + c.amount, 0);
  const totalClearedDeposits = clearedDeposits.reduce((sum, d) => sum + d.amount, 0);
  
  const calculatedEndingBalance = 
    parseFloat(beginningBalance || "0") + totalClearedDeposits - totalClearedChecks;
  
  const difference = calculatedEndingBalance - parseFloat(endingBalance || "0");

  useEffect(() => {
    if (transactions) {
      const reconciledIds = new Set<string>();
      [...transactions.checks, ...transactions.deposits].forEach(t => {
        if (t.reconciled) {
          reconciledIds.add(t.id);
        }
      });
      setCheckedTransactions(reconciledIds);
    }
  }, [transactions]);

  // Sync hideTransactionsAfterDate with statementDate
  useEffect(() => {
    if (statementDate) {
      setHideTransactionsAfterDate(statementDate);
    }
  }, [statementDate]);

  const handleToggleTransaction = (id: string) => {
    setCheckedTransactions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleUpdateTransaction = async (id: string, type: 'check' | 'deposit' | 'bill_payment', field: string, value: any) => {
    try {
      if (type === 'check') {
        await updateCheckTransaction.mutateAsync({ id, field, value });
      } else if (type === 'deposit') {
        await updateDepositTransaction.mutateAsync({ id, field, value });
      } else if (type === 'bill_payment') {
        await updateBillPaymentTransaction.mutateAsync({ 
          id, 
          field, 
          value,
          bankAccountId: selectedBankAccountId!
        });
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedBankAccountId || !statementDate) {
      return;
    }

    // Validate statement date is after last completed reconciliation
    if (lastCompletedDate && statementDate <= lastCompletedDate) {
      toast({
        title: "Invalid Date",
        description: `Statement date must be after ${format(lastCompletedDate, "PP")} (last reconciliation date).`,
        variant: "destructive"
      });
      return;
    }

    try {
      const reconciliationData = {
        owner_id: user!.id,
        project_id: projectId || null,
        bank_account_id: selectedBankAccountId,
        statement_date: format(statementDate, 'yyyy-MM-dd'),
        statement_beginning_balance: parseFloat(beginningBalance || "0"),
        statement_ending_balance: parseFloat(endingBalance || "0"),
        reconciled_balance: calculatedEndingBalance,
        difference: difference,
        status: 'in_progress' as const,
        notes,
      };

      if (currentReconciliationId) {
        await updateReconciliation.mutateAsync({
          id: currentReconciliationId,
          data: reconciliationData,
        });
      } else {
        const result = await createReconciliation.mutateAsync(reconciliationData);
        setCurrentReconciliationId(result.id);
      }
    } catch (error) {
      console.error('Error saving reconciliation:', error);
    }
  };

  const handleFinishReconciliation = async () => {
    if (!selectedBankAccountId || !statementDate) {
      return;
    }

    // Validate statement date is after last completed reconciliation
    if (lastCompletedDate && statementDate <= lastCompletedDate) {
      toast({
        title: "Invalid Date",
        description: `Statement date must be after ${format(lastCompletedDate, "PP")} (last reconciliation date).`,
        variant: "destructive"
      });
      return;
    }

    if (Math.abs(difference) > 0.01) {
      alert(`The difference must be $0.00 to complete reconciliation. Current difference: $${difference.toFixed(2)}`);
      return;
    }

    // Check for outstanding transactions when difference is zero
    const uncheckedChecks = transactions?.checks.filter(c => !c.reconciled && !checkedTransactions.has(c.id)) || [];
    const uncheckedDeposits = transactions?.deposits.filter(d => !d.reconciled && !checkedTransactions.has(d.id)) || [];
    
    if ((uncheckedChecks.length > 0 || uncheckedDeposits.length > 0) && Math.abs(difference) < 0.01) {
      const message = `You have ${uncheckedChecks.length} unchecked check(s)/bill payment(s) and ${uncheckedDeposits.length} unchecked deposit(s), but the difference is $0.00. This may indicate that transactions were manually adjusted to balance without being properly reconciled.`;
      setUncheckedWarningMessage(message);
      setUncheckedWarningDialogOpen(true);
      return;
    }

    await completeReconciliation();
  };

  const completeReconciliation = async () => {
    if (!selectedBankAccountId || !statementDate) {
      return;
    }

    try {
      const reconciliationData = {
        owner_id: user!.id,
        project_id: projectId || null,
        bank_account_id: selectedBankAccountId,
        statement_date: format(statementDate, 'yyyy-MM-dd'),
        statement_beginning_balance: parseFloat(beginningBalance || "0"),
        statement_ending_balance: parseFloat(endingBalance || "0"),
        reconciled_balance: calculatedEndingBalance,
        difference: 0,
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        completed_by: user!.id,
        notes,
      };

      let reconciliationId = currentReconciliationId;
      if (reconciliationId) {
        await updateReconciliation.mutateAsync({
          id: reconciliationId,
          data: reconciliationData,
        });
      } else {
        const result = await createReconciliation.mutateAsync(reconciliationData);
        reconciliationId = result.id;
      }

      const dateStr = format(statementDate, 'yyyy-MM-dd');
      const promises = [];

      for (const check of transactions?.checks || []) {
        const shouldBeReconciled = checkedTransactions.has(check.id);
        if (check.reconciled !== shouldBeReconciled) {
          promises.push(
            markTransactionReconciled.mutateAsync({
              type: check.type,
              id: check.id,
              reconciled: shouldBeReconciled,
              reconciliationId: shouldBeReconciled ? reconciliationId! : undefined,
              reconciliationDate: shouldBeReconciled ? dateStr : undefined,
            })
          );
        }
      }

      for (const deposit of transactions?.deposits || []) {
        const shouldBeReconciled = checkedTransactions.has(deposit.id);
        if (deposit.reconciled !== shouldBeReconciled) {
          promises.push(
            markTransactionReconciled.mutateAsync({
              type: 'deposit',
              id: deposit.id,
              reconciled: shouldBeReconciled,
              reconciliationId: shouldBeReconciled ? reconciliationId! : undefined,
              reconciliationDate: shouldBeReconciled ? dateStr : undefined,
            })
          );
        }
      }

      await Promise.all(promises);
      
      // Show success toast and reset form for next month
      toast({
        title: "Reconciliation Completed",
        description: "The reconciliation has been saved successfully. You can now start the next month.",
      });
      
      // Reset form for next month
      setEndingBalance("");
      setNotes("");
      setCurrentReconciliationId(null);
      setCheckedTransactions(new Set());
      // The useEffect will automatically populate the new beginning balance and statement date
    } catch (error) {
      console.error('Error completing reconciliation:', error);
      toast({
        title: "Error",
        description: "Failed to complete reconciliation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Auto-populate beginning balance and statement date from reconciliation history
  useEffect(() => {
    if (!selectedBankAccountId || !reconciliationHistory || reconciliationHistory.length === 0) {
      // Reset to $0 when no history at all
      setBeginningBalance("0");
      setCurrentReconciliationId(null);
      setLastCompletedDate(null);
      return;
    }

    // Find in-progress and last completed
    const inProgress = reconciliationHistory.find((r: any) => r.status === 'in_progress');
    const lastCompleted = reconciliationHistory.find((r: any) => r.status === 'completed');
    
    // Beginning balance ALWAYS comes from last completed reconciliation (or $0 if none)
    const correctBeginningBalance = lastCompleted?.statement_ending_balance ?? 0;
    
    // Track last completed date for calendar validation
    if (lastCompleted) {
      setLastCompletedDate(new Date(lastCompleted.statement_date));
    } else {
      setLastCompletedDate(null);
    }

    if (inProgress) {
      setCurrentReconciliationId(inProgress.id);
      setBeginningBalance(String(correctBeginningBalance));
      setStatementDate(new Date(inProgress.statement_date));
      setEndingBalance(String(inProgress.statement_ending_balance || ""));
      setNotes(inProgress.notes || "");
      return;
    }

    // No in-progress, use last completed for date calculation
    if (lastCompleted) {
      setCurrentReconciliationId(null);
      setBeginningBalance(String(correctBeginningBalance));
      setStatementDate(endOfMonth(addMonths(new Date(lastCompleted.statement_date), 1)));
    } else {
      // No completed, no in-progress - start fresh at $0
      setCurrentReconciliationId(null);
      setBeginningBalance("0");
    }
  }, [selectedBankAccountId, reconciliationHistory]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Check if this is the most recent completed reconciliation
  const isLatestCompleted = (rec: any) => {
    if (rec.status !== 'completed') return false;
    const completedRecs = reconciliationHistory
      ?.filter((r: any) => r.status === 'completed')
      .sort((a: any, b: any) => new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime());
    return completedRecs?.[0]?.id === rec.id;
  };

  const handleUndoReconciliation = (rec: any) => {
    setSelectedReconciliationToUndo(rec);
    setUndoDialogOpen(true);
  };

  const confirmUndoReconciliation = async () => {
    if (!selectedReconciliationToUndo) return;
    try {
      await undoReconciliation.mutateAsync(selectedReconciliationToUndo.id);
      toast({
        title: "Reconciliation undone",
        description: "The reconciliation has been successfully reversed.",
      });
      setUndoDialogOpen(false);
      setSelectedReconciliationToUndo(null);
    } catch (error) {
      console.error('Error undoing reconciliation:', error);
      toast({
        title: "Error",
        description: "Failed to undo reconciliation.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        {/* All fields in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 mb-6">
          <div className="lg:col-span-3">
            <Label htmlFor="bank-account">Bank Account</Label>
            <Select
              value={selectedBankAccountId || ""}
              onValueChange={(value) => {
                setSelectedBankAccountId(value || null);
                setEndingBalance("");
                setNotes("");
                setCheckedTransactions(new Set());
              }}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select a bank account..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Label>Statement Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!selectedBankAccountId}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !statementDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {statementDate ? format(statementDate, "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={statementDate}
                  onSelect={setStatementDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => {
                    // Disable dates on or before the last completed reconciliation
                    if (lastCompletedDate) {
                      return date <= lastCompletedDate;
                    }
                    return false;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="lg:col-span-2">
            <Label>Hide transactions after</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!selectedBankAccountId}
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !hideTransactionsAfterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {hideTransactionsAfterDate ? format(hideTransactionsAfterDate, "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={hideTransactionsAfterDate}
                  onSelect={setHideTransactionsAfterDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor="beginning-balance">
              Beginning Balance
            </Label>
            <Input
              id="beginning-balance"
              type="number"
              step="0.01"
              value={selectedBankAccountId ? beginningBalance : ""}
              disabled={true}
              className="mt-1 bg-muted cursor-not-allowed"
            />
          </div>

          <div className="lg:col-span-3">
            <Label htmlFor="ending-balance">Ending Balance</Label>
            <Input
              id="ending-balance"
              type="number"
              step="0.01"
              value={selectedBankAccountId ? endingBalance : ""}
              onChange={(e) => setEndingBalance(e.target.value)}
              disabled={!selectedBankAccountId}
              className="mt-1"
            />
          </div>
        </div>

          {selectedBankAccountId && (
            <>

            <Separator className="my-6" />

            {transactionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading transactions...</p>
              </div>
            ) : !transactions || (transactions.checks.length === 0 && transactions.deposits.length === 0) ? (
              <div className="text-center py-8 border rounded-lg bg-muted/20">
                <p className="text-muted-foreground mb-2">
                  No unreconciled transactions found for this account.
                </p>
                <p className="text-sm text-muted-foreground">
                  Checks/Bill Payments: {transactions?.checks.length || 0}, Deposits: {transactions?.deposits.length || 0}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Outstanding Checks & Bill Payments</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left w-12"></th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Type</th>
                          <th className="p-2 text-left">Ref #</th>
                          <th className="p-2 text-left">Payee</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions?.checks
                          .filter(c => !c.reconciled)
                          .filter(c => !hideTransactionsAfterDate || new Date(c.date) <= hideTransactionsAfterDate)
                          .map((check) => (
                            <tr key={check.id} className="border-t">
                              <td className="p-2">
                                <Checkbox
                                  checked={checkedTransactions.has(check.id)}
                                  onCheckedChange={() => handleToggleTransaction(check.id)}
                                />
                              </td>
                  <td className="p-2">
                    <InlineEditCell
                      value={check.date}
                      type="date"
                      onSave={(value) => handleUpdateTransaction(check.id, check.type, 'date', value)}
                      displayFormat={(date) => format(new Date(date + "T12:00:00"), "MM/dd/yyyy")}
                    />
                  </td>
                              <td className="p-2">
                                {check.type === 'bill_payment' ? 'Bill Payment' : 'Check'}
                              </td>
                              <td className="p-2">
                                <InlineEditCell
                                  value={check.reference_number || ''}
                                  type="text"
                                  onSave={(value) => handleUpdateTransaction(check.id, check.type, 'reference_number', value)}
                                />
                              </td>
                              <td className="p-2">{check.payee}</td>
                              <td className="p-2 text-right">
                                <InlineEditCell
                                  value={check.amount.toString()}
                                  type="number"
                                  onSave={(value) => handleUpdateTransaction(check.id, check.type, 'amount', value)}
                                  displayFormat={(val) => formatCurrency(parseFloat(val))}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Outstanding Deposits</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left w-12"></th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Source</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions?.deposits
                          .filter(d => !d.reconciled)
                          .filter(d => !hideTransactionsAfterDate || new Date(d.date) <= hideTransactionsAfterDate)
                          .map((deposit) => (
                            <tr key={deposit.id} className="border-t">
                              <td className="p-2">
                                <Checkbox
                                  checked={checkedTransactions.has(deposit.id)}
                                  onCheckedChange={() => handleToggleTransaction(deposit.id)}
                                />
                              </td>
                  <td className="p-2">
                    <InlineEditCell
                      value={deposit.date}
                      type="date"
                      onSave={(value) => handleUpdateTransaction(deposit.id, 'deposit', 'date', value)}
                      displayFormat={(date) => format(new Date(date + "T12:00:00"), "MM/dd/yyyy")}
                    />
                  </td>
                              <td className="p-2">{deposit.source}</td>
                              <td className="p-2 text-right">
                                <InlineEditCell
                                  value={deposit.amount.toString()}
                                  type="number"
                                  onSave={(value) => handleUpdateTransaction(deposit.id, 'deposit', 'amount', value)}
                                  displayFormat={(val) => formatCurrency(parseFloat(val))}
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Statement Beginning Balance:</span>
                      <span className="font-semibold">{formatCurrency(parseFloat(beginningBalance || "0"))}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Plus: Deposits Cleared ({clearedDeposits.length}):</span>
                      <span className="font-semibold">+{formatCurrency(totalClearedDeposits)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Minus: Checks & Bill Payments Cleared ({clearedChecks.length}):</span>
                      <span className="font-semibold">-{formatCurrency(totalClearedChecks)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Calculated Ending Balance:</span>
                      <span>{formatCurrency(calculatedEndingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statement Ending Balance:</span>
                      <span>{formatCurrency(parseFloat(endingBalance || "0"))}</span>
                    </div>
                    <Separator />
                    <div className={cn(
                      "flex justify-between text-lg font-bold",
                      Math.abs(difference) < 0.01 ? "text-green-600" : "text-red-600"
                    )}>
                      <span>Difference:</span>
                      <span>{formatCurrency(difference)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes about this reconciliation..."
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => navigate(`/project/${projectId}/accounting`)}>
                    Cancel
                  </Button>
                  <Button variant="outline" onClick={handleSaveProgress}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Progress
                  </Button>
                  <Button 
                    onClick={handleFinishReconciliation}
                    disabled={Math.abs(difference) > 0.01}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finish Reconciliation
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Reconciliation History Section */}
      {selectedBankAccountId && reconciliationHistory && reconciliationHistory.length > 0 && (
        <Card className="p-6">
          <Collapsible open={isHistoryExpanded} onOpenChange={setIsHistoryExpanded}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Reconciliation History</h3>
                <p className="text-sm text-muted-foreground">
                  {reconciliationHistory.length} reconciliation{reconciliationHistory.length !== 1 ? 's' : ''}
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isHistoryExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 text-left">Statement Date</th>
                      <th className="p-3 text-right">Beginning Balance</th>
                      <th className="p-3 text-right">Ending Balance</th>
                      <th className="p-3 text-right">Difference</th>
                      <th className="p-3 text-left">Completed Date</th>
                      <th className="p-3 text-left">Notes</th>
                      {canUndoReconciliation && <th className="p-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliationHistory
                      .filter((rec: any) => rec.status === 'completed')
                      .sort((a: any, b: any) => new Date(b.statement_date).getTime() - new Date(a.statement_date).getTime())
                      .map((rec: any) => (
                        <tr key={rec.id} className="border-t hover:bg-muted/50">
                          <td className="p-3">
                            {format(new Date(rec.statement_date), "MM/dd/yyyy")}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(rec.statement_beginning_balance || 0)}
                          </td>
                          <td className="p-3 text-right">
                            {formatCurrency(rec.statement_ending_balance || 0)}
                          </td>
                          <td className={cn(
                            "p-3 text-right font-medium",
                            Math.abs(rec.difference || 0) < 0.01 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCurrency(rec.difference || 0)}
                          </td>
                          <td className="p-3">
                            {rec.completed_at 
                              ? format(new Date(rec.completed_at), "MM/dd/yyyy")
                              : "-"
                            }
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {rec.notes || "-"}
                          </td>
                          {canUndoReconciliation && (
                            <td className="p-3 text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUndoReconciliation(rec)}
                                      disabled={!isLatestCompleted(rec)}
                                      className={cn(
                                        "h-8 w-8 p-0",
                                        isLatestCompleted(rec) ? "text-red-600 hover:text-red-700" : "text-muted-foreground"
                                      )}
                                    >
                                      <Lock className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isLatestCompleted(rec) 
                                      ? "Undo this reconciliation" 
                                      : "Only the most recent completed reconciliation can be undone"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Undo Reconciliation Confirmation Dialog */}
      <AlertDialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo Reconciliation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all transactions from this reconciliation as unreconciled and delete the reconciliation record. 
              This action cannot be undone.
              {selectedReconciliationToUndo && (
                <div className="mt-2 text-sm">
                  <strong>Statement Date:</strong> {format(new Date(selectedReconciliationToUndo.statement_date), "MM/dd/yyyy")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUndoReconciliation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Undo Reconciliation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unchecked Transactions Warning Dialog */}
      <AlertDialog open={uncheckedWarningDialogOpen} onOpenChange={setUncheckedWarningDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Unchecked Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              {uncheckedWarningMessage}
              <div className="mt-3 font-medium">
                Are you sure you want to complete this reconciliation?
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setUncheckedWarningDialogOpen(false);
                completeReconciliation();
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
