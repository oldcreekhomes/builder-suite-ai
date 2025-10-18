import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useProject } from "@/hooks/useProject";
import { useBankReconciliation } from "@/hooks/useBankReconciliation";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const BankReconciliation = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: project } = useProject(projectId!);
  const { accounts } = useAccounts();

  // Bank reconciliation state
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const [statementDate, setStatementDate] = useState<Date>();
  const [beginningBalance, setBeginningBalance] = useState<string>("");
  const [endingBalance, setEndingBalance] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [checkedTransactions, setCheckedTransactions] = useState<Set<string>>(new Set());
  const [currentReconciliationId, setCurrentReconciliationId] = useState<string | null>(null);

  const {
    useReconciliationTransactions,
    createReconciliation,
    updateReconciliation,
    markTransactionReconciled,
  } = useBankReconciliation();

  const { data: transactions, isLoading: transactionsLoading } = useReconciliationTransactions(
    projectId || null,
    selectedBankAccountId
  );

  // Filter bank accounts (asset type accounts)
  const bankAccounts = accounts?.filter(
    (acc) => acc.type === 'asset' && acc.is_active
  ) || [];

  // Calculate totals
  const clearedChecks = transactions?.checks.filter(c => checkedTransactions.has(c.id)) || [];
  const clearedDeposits = transactions?.deposits.filter(d => checkedTransactions.has(d.id)) || [];
  
  const totalClearedChecks = clearedChecks.reduce((sum, c) => sum + c.amount, 0);
  const totalClearedDeposits = clearedDeposits.reduce((sum, d) => sum + d.amount, 0);
  
  const calculatedEndingBalance = 
    parseFloat(beginningBalance || "0") + totalClearedDeposits - totalClearedChecks;
  
  const difference = calculatedEndingBalance - parseFloat(endingBalance || "0");

  // Load previously reconciled transactions
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
      // First save/update the reconciliation record
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

      // Mark all checked transactions as reconciled
      const dateStr = format(statementDate, 'yyyy-MM-dd');
      const promises = [];

      for (const check of transactions?.checks || []) {
        const shouldBeReconciled = checkedTransactions.has(check.id);
        if (check.reconciled !== shouldBeReconciled) {
          promises.push(
            markTransactionReconciled.mutateAsync({
              type: 'check',
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

      // Navigate back
      navigate(`/project/${projectId}/accounting`);
    } catch (error) {
      console.error('Error completing reconciliation:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Bank Reconciliation"
            projectId={projectId}
          />
          <div className="flex-1 overflow-y-auto p-6">
            <Card className="p-6">
              {/* Bank Account Selection */}
              <div className="mb-6">
                <Label htmlFor="bank-account">Bank Account</Label>
                <select
                  id="bank-account"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  value={selectedBankAccountId || ""}
                  onChange={(e) => setSelectedBankAccountId(e.target.value || null)}
                >
                  <option value="">Select a bank account...</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBankAccountId && (
                <>
                  {/* Statement Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                      <Label htmlFor="beginning-balance">Beginning Balance</Label>
                      <Input
                        id="beginning-balance"
                        type="number"
                        step="0.01"
                        value={beginningBalance}
                        onChange={(e) => setBeginningBalance(e.target.value)}
                        className="mt-1"
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
                  </div>

                  <Separator className="my-6" />

                  {/* Transactions */}
                  {transactionsLoading ? (
                    <div>Loading transactions...</div>
                  ) : (
                    <div className="space-y-6">
                      {/* Outstanding Checks */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Outstanding Checks</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-muted">
                              <tr>
                                <th className="p-2 text-left w-12"></th>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Check #</th>
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
                                    <td className="p-2">{check.reference_number || '-'}</td>
                                    <td className="p-2">{check.payee}</td>
                                    <td className="p-2 text-right">{formatCurrency(check.amount)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Outstanding Deposits */}
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

                      {/* Summary Panel */}
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
                            <span>Minus: Checks Cleared ({clearedChecks.length}):</span>
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

                      {/* Notes */}
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

                      {/* Actions */}
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
        </div>
      </div>
    </SidebarProvider>
  );
};

export default BankReconciliation;
