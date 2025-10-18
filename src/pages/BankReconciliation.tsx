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
import { format, addMonths } from "date-fns";
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
    useReconciliationHistory,
    useReconciliationDefaults,
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

  const { 
    data: defaults, 
    isLoading: defaultsLoading 
  } = useReconciliationDefaults(selectedBankAccountId);

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

  // Reset form when bank account changes (clear once)
  useEffect(() => {
    if (!selectedBankAccountId) return;
    
    setStatementDate(undefined);
    setBeginningBalance("");
    setEndingBalance("");
    setNotes("");
    setCheckedTransactions(new Set());
    setCurrentReconciliationId(null);
  }, [selectedBankAccountId]);

  // Auto-populate from defaults RPC (safety fallback)
  useEffect(() => {
    if (!selectedBankAccountId || defaultsLoading || !defaults) return;
    
    // Only populate if fields are still empty (prevents overriding immediate population)
    if (beginningBalance !== "" || statementDate !== undefined) return;

    console.log('[Recon Defaults] Fallback applying:', { selectedBankAccountId, defaults });

    if (defaults.mode === 'active') {
      console.log('[Recon] Resuming in-progress reconciliation');
      setCurrentReconciliationId(defaults.reconciliation_id);
      setBeginningBalance(String(defaults.beginning_balance || 0));
      setStatementDate(new Date(defaults.statement_date));
    } else if (defaults.mode === 'last_completed') {
      console.log('[Recon] Using last completed reconciliation (next statement)');
      setCurrentReconciliationId(null);
      setBeginningBalance(String(defaults.beginning_balance || 0));
      setStatementDate(new Date(defaults.statement_date));
    } else {
      console.log('[Recon] First reconciliation - defaulting beginning balance to 0');
      setCurrentReconciliationId(null);
      setBeginningBalance("0");
      setStatementDate(undefined);
    }
  }, [defaults, defaultsLoading, beginningBalance, statementDate]);

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

  const applyDefaults = (row: any) => {
    console.log('[Recon Defaults] Applying immediately on selection:', row);
    setCurrentReconciliationId(row?.reconciliation_id || null);
    setBeginningBalance(String(row?.beginning_balance ?? 0));
    setStatementDate(row?.statement_date ? new Date(row.statement_date) : undefined);
  };

  const fetchAndApplyDefaults = async (bankAccountId: string) => {
    // Try RPC first
    try {
      const { data, error } = await supabase.rpc('get_reconciliation_defaults', {
        bank_account_id: bankAccountId,
      });
      const row = !error && data?.[0] ? data[0] : null;
      if (row && (row.statement_date || row.mode === 'active' || row.mode === 'last_completed')) {
        console.debug('[Recon Defaults] Using RPC defaults:', row);
        applyDefaults(row);
        return;
      }
      if (error) {
        console.warn('[Recon Defaults] RPC error, falling back:', error);
      }
    } catch (e) {
      console.warn('[Recon Defaults] RPC failed, falling back to direct queries:', e);
    }

    // Fallback: direct queries
    const { data: active } = await supabase
      .from('bank_reconciliations')
      .select('id, statement_date, statement_beginning_balance')
      .eq('bank_account_id', bankAccountId)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (active) {
      console.debug('[Recon Defaults] Using active reconciliation:', active);
      setCurrentReconciliationId(active.id);
      setBeginningBalance(String((active as any).statement_beginning_balance ?? 0));
      setStatementDate((active as any).statement_date ? new Date((active as any).statement_date) : undefined);
      return;
    }

    const { data: completed } = await supabase
      .from('bank_reconciliations')
      .select('id, statement_date, statement_ending_balance')
      .eq('bank_account_id', bankAccountId)
      .eq('status', 'completed')
      .order('statement_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (completed) {
      console.debug('[Recon Defaults] Using last completed reconciliation:', completed);
      setCurrentReconciliationId(null);
      setBeginningBalance(String((completed as any).statement_ending_balance ?? 0));
      setStatementDate((completed as any).statement_date ? addMonths(new Date((completed as any).statement_date), 1) : undefined);
      return;
    }

    console.debug('[Recon Defaults] No history found, defaulting to zero');
    setCurrentReconciliationId(null);
    setBeginningBalance('0');
    setStatementDate(undefined);
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
                <Select
                  value={selectedBankAccountId || ""}
                  onValueChange={async (value) => {
                    setSelectedBankAccountId(value || null);
                    
                    // Clear fields immediately
                    setStatementDate(undefined);
                    setBeginningBalance("");
                    setEndingBalance("");
                    setNotes("");
                    setCheckedTransactions(new Set());
                    setCurrentReconciliationId(null);

                    if (!value) return;

                    // Fetch and apply defaults immediately (RPC with direct-query fallback)
                    await fetchAndApplyDefaults(value);
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
                  {!defaultsLoading && defaults?.mode === 'none' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <strong>First Reconciliation:</strong> This is the first reconciliation for this account. 
                        The beginning balance is set to $0.00. Enter your current bank statement ending balance below.
                      </p>
                    </div>
                  )}

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
                      <Label htmlFor="beginning-balance">
                        Beginning Balance
                        {reconciliationHistory && reconciliationHistory.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (From last reconciliation)
                          </span>
                        )}
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
