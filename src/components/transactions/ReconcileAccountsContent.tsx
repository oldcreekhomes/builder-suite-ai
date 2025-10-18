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
import { format, addMonths, endOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, CheckCircle2 } from "lucide-react";
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
  const [beginningBalance, setBeginningBalance] = useState<string>("");
  const [endingBalance, setEndingBalance] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(new Set());
  const [currentReconciliationId, setCurrentReconciliationId] = useState<string | null>(null);

  const { 
    useReconciliationTransactions,
    useReconciliationHistory,
    createReconciliation,
    updateReconciliation,
    markTransactionReconciled,
  } = useBankReconciliation();

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

  const handleSaveProgress = async () => {
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

    if (Math.abs(difference) > 0.01) {
      alert(`The difference must be $0.00 to complete reconciliation. Current difference: $${difference.toFixed(2)}`);
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
      navigate(`/project/${projectId}/accounting`);
    } catch (error) {
      console.error('Error completing reconciliation:', error);
    }
  };

  // Auto-populate beginning balance and statement date from reconciliation history
  useEffect(() => {
    if (!selectedBankAccountId || !reconciliationHistory || reconciliationHistory.length === 0) {
      return;
    }

    // Find in-progress first
    const inProgress = reconciliationHistory.find((r: any) => r.status === 'in_progress');
    if (inProgress) {
      setCurrentReconciliationId(inProgress.id);
      setBeginningBalance(String(inProgress.statement_beginning_balance ?? 0));
      setStatementDate(new Date(inProgress.statement_date));
      return;
    }

    // Otherwise use last completed
    const lastCompleted = reconciliationHistory.find((r: any) => r.status === 'completed');
    if (lastCompleted) {
      setCurrentReconciliationId(null);
      setBeginningBalance(String(lastCompleted.statement_ending_balance ?? 0));
      setStatementDate(endOfMonth(addMonths(new Date(lastCompleted.statement_date), 1)));
    }
  }, [selectedBankAccountId, reconciliationHistory]);


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        {/* All fields in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
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

          {selectedBankAccountId && (
            <>
              <div>
                <Label>Statement Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
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
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="beginning-balance">
                  Beginning Balance
                </Label>
                <Input
                  id="beginning-balance"
                  type="number"
                  step="0.01"
                  value={beginningBalance}
                  disabled={true}
                  className="mt-1 bg-muted cursor-not-allowed"
                />
              </div>

              <div>
                <Label htmlFor="ending-balance">Statement Ending Balance</Label>
                <Input
                  id="ending-balance"
                  type="number"
                  step="0.01"
                  value={endingBalance}
                  onChange={(e) => setEndingBalance(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          )}
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
                <p className="text-xs text-muted-foreground mt-2">
                  Check the browser console for detailed query information.
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
                          .map((check) => (
                            <tr key={check.id} className="border-t">
                              <td className="p-2">
                                <Checkbox
                                  checked={checkedTransactions.has(check.id)}
                                  onCheckedChange={() => handleToggleTransaction(check.id)}
                                />
                              </td>
                              <td className="p-2">{format(new Date(check.date), "MM/dd/yyyy")}</td>
                              <td className="p-2">
                                {check.type === 'bill_payment' ? 'Bill Payment' : 'Check'}
                              </td>
                              <td className="p-2">{check.reference_number || '-'}</td>
                              <td className="p-2">{check.payee}</td>
                              <td className="p-2 text-right">{formatCurrency(check.amount)}</td>
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
                          .map((deposit) => (
                            <tr key={deposit.id} className="border-t">
                              <td className="p-2">
                                <Checkbox
                                  checked={checkedTransactions.has(deposit.id)}
                                  onCheckedChange={() => handleToggleTransaction(deposit.id)}
                                />
                              </td>
                              <td className="p-2">{format(new Date(deposit.date), "MM/dd/yyyy")}</td>
                              <td className="p-2">{deposit.source}</td>
                              <td className="p-2 text-right">{formatCurrency(deposit.amount)}</td>
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
    </div>
  );
}
