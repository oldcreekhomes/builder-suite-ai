import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { AccountSearchInputInline } from "@/components/AccountSearchInputInline";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useChecks, CheckLineData } from "@/hooks/useChecks";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";
import { useLots } from "@/hooks/useLots";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toDateLocal } from "@/utils/dateOnly";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkId: string;
}

interface CheckRow {
  id: string;
  account: string;
  accountId?: string;
  costCodeId?: string;
  projectId?: string;
  amount: string;
  memo: string;
  lotId?: string;
}

export function EditCheckDialog({ open, onOpenChange, checkId }: EditCheckDialogProps) {
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payTo, setPayTo] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [memo, setMemo] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("expense");
  const [isSaving, setIsSaving] = useState(false);

  const [jobCostRows, setJobCostRows] = useState<CheckRow[]>([
    { id: "1", account: "", costCodeId: "", projectId: "", amount: "", memo: "" }
  ]);
  const [expenseRows, setExpenseRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", amount: "", memo: "" }
  ]);

  const { accounts } = useAccounts();
  const { updateCheck } = useChecks();
  const { costCodes } = useCostCodeSearch();

  const { data: checkData, isLoading } = useQuery({
    queryKey: ['check-edit', checkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checks')
        .select(`
          *,
          check_lines (
            id, amount, memo, lot_id, account_id, cost_code_id, project_id, line_type, line_number
          )
        `)
        .eq('id', checkId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!checkId,
  });

  const { lots } = useLots(checkData?.project_id);
  const showAddressColumn = lots.length > 1;

  useEffect(() => {
    if (!checkData || !accounts.length) return;

    setCheckDate(toDateLocal(checkData.check_date));
    setPayTo(checkData.pay_to || "");
    setCheckNumber(checkData.check_number || "");
    setMemo(checkData.memo || "");

    const bankAcct = accounts.find(a => a.id === checkData.bank_account_id);
    if (bankAcct) {
      setBankAccount(`${bankAcct.code} - ${bankAcct.name}`);
    }

    const newJobCostRows: CheckRow[] = [];
    const newExpenseRows: CheckRow[] = [];
    const lines = checkData.check_lines || [];

    for (const line of lines) {
      const row: CheckRow = {
        id: line.id,
        account: "",
        accountId: line.account_id || "",
        costCodeId: line.cost_code_id || "",
        projectId: line.project_id || "",
        amount: String(line.amount || 0),
        memo: line.memo || "",
        lotId: line.lot_id || "",
      };

      if (line.line_type === 'job_cost') {
        const costCode = costCodes.find(cc => cc.id === line.cost_code_id);
        if (costCode) row.account = `${costCode.code} - ${costCode.name}`;
        newJobCostRows.push(row);
      } else {
        const account = accounts.find(a => a.id === line.account_id);
        if (account) row.account = `${account.code} - ${account.name}`;
        newExpenseRows.push(row);
      }
    }

    setJobCostRows(newJobCostRows.length > 0 ? newJobCostRows : [{ id: "1", account: "", costCodeId: "", projectId: "", amount: "", memo: "" }]);
    setExpenseRows(newExpenseRows.length > 0 ? newExpenseRows : [{ id: "1", account: "", accountId: "", amount: "", memo: "" }]);

    if (newExpenseRows.length > 0) setActiveTab("expense");
    else if (newJobCostRows.length > 0) setActiveTab("job_cost");
    else setActiveTab("expense");
  }, [checkData, accounts, costCodes]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

  const calculateTotal = () => {
    const jcTotal = jobCostRows.reduce((sum, row) => sum + (parseFloat(row.amount || "0") || 0), 0);
    const expTotal = expenseRows.reduce((sum, row) => sum + (parseFloat(row.amount || "0") || 0), 0);
    return jcTotal + expTotal;
  };

  const addRow = (type: 'job_cost' | 'expense') => {
    const newRow: CheckRow = { id: Date.now().toString(), account: "", amount: "", memo: "" };
    if (type === 'job_cost') setJobCostRows(prev => [...prev, { ...newRow, costCodeId: "", projectId: "" }]);
    else setExpenseRows(prev => [...prev, { ...newRow, accountId: "" }]);
  };

  const removeRow = (type: 'job_cost' | 'expense', id: string) => {
    if (type === 'job_cost') {
      if (jobCostRows.length > 1) setJobCostRows(prev => prev.filter(r => r.id !== id));
    } else {
      if (expenseRows.length > 1) setExpenseRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRow = (type: 'job_cost' | 'expense', id: string, field: keyof CheckRow, value: string) => {
    const setter = type === 'job_cost' ? setJobCostRows : setExpenseRows;
    setter(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (!payTo) {
        toast({ title: "Validation Error", description: "Please enter who the check is payable to", variant: "destructive" });
        return;
      }

      const checkLines: CheckLineData[] = [];

      for (const row of jobCostRows) {
        const amount = parseFloat(row.amount || "0") || 0;
        if (amount > 0 && row.costCodeId) {
          checkLines.push({
            line_type: 'job_cost',
            cost_code_id: row.costCodeId,
            project_id: row.projectId || checkData?.project_id || undefined,
            lot_id: row.lotId || undefined,
            amount,
            memo: row.memo || undefined,
          });
        }
      }

      for (const row of expenseRows) {
        const amount = parseFloat(row.amount || "0") || 0;
        if (amount > 0 && row.accountId) {
          checkLines.push({
            line_type: 'expense',
            account_id: row.accountId,
            project_id: checkData?.project_id || undefined,
            lot_id: row.lotId || undefined,
            amount,
            memo: row.memo || undefined,
          });
        }
      }

      if (checkLines.length === 0) {
        toast({ title: "Validation Error", description: "Please add at least one line item", variant: "destructive" });
        return;
      }

      const total = checkLines.reduce((sum, l) => sum + l.amount, 0);

      await updateCheck.mutateAsync({
        checkId,
        updates: {
          check_date: checkDate.toISOString().split('T')[0],
          check_number: checkNumber || undefined,
          pay_to: payTo,
          memo: memo || undefined,
          amount: total,
        },
        checkLines,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving check:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getTabTotal = (type: 'job_cost' | 'expense') => {
    const rows = type === 'job_cost' ? jobCostRows : expenseRows;
    return rows.reduce((sum, row) => sum + (parseFloat(row.amount || "0") || 0), 0);
  };

  const renderLineItems = (type: 'job_cost' | 'expense') => {
    const rows = type === 'job_cost' ? jobCostRows : expenseRows;
    const tabTotal = getTabTotal(type);
    const tabLabel = type === 'job_cost' ? 'Job Cost Total:' : 'Expense Total:';

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => addRow(type)} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className={cn(
            "grid gap-2 p-3 bg-muted font-medium text-sm",
            "grid-cols-20"
          )}>
            <div className="col-span-5">{type === 'job_cost' ? 'Cost Code' : 'Account'}</div>
            <div className="col-span-4">Memo</div>
            <div className="col-span-3">Amount</div>
            {showAddressColumn && <div className="col-span-4">Address</div>}
            <div className={cn(showAddressColumn ? "col-span-4" : "col-span-8", "text-right")}>Action</div>
          </div>

          {rows.map(row => (
            <div key={row.id} className={cn(
              "grid gap-2 p-3 border-t",
              showAddressColumn ? "grid-cols-20" : "grid-cols-16"
            )}>
              <div className="col-span-5">
                {type === 'job_cost' ? (
                  <CostCodeSearchInput
                    value={row.account}
                    onChange={(val) => updateRow(type, row.id, 'account', val)}
                    onCostCodeSelect={(cc) => {
                      updateRow(type, row.id, 'account', `${cc.code} - ${cc.name}`);
                      updateRow(type, row.id, 'costCodeId', cc.id);
                    }}
                    placeholder="Search cost codes..."
                    className="h-8"
                  />
                ) : (
                  <AccountSearchInputInline
                    value={row.account}
                    onChange={(val) => updateRow(type, row.id, 'account', val)}
                    onAccountSelect={(acc) => {
                      updateRow(type, row.id, 'account', `${acc.code} - ${acc.name}`);
                      updateRow(type, row.id, 'accountId', acc.id);
                    }}
                    placeholder="Search accounts..."
                    className="h-8"
                  />
                )}
              </div>
              <div className="col-span-4">
                <Input
                  value={row.memo}
                  onChange={(e) => updateRow(type, row.id, 'memo', e.target.value)}
                  placeholder="Memo"
                  className="h-8"
                />
              </div>
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    value={row.amount}
                    onChange={(e) => updateRow(type, row.id, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
              {showAddressColumn && (
                <div className="col-span-4">
                  <Select
                    value={row.lotId || ""}
                    onValueChange={(value) => updateRow(type, row.id, 'lotId', value)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {lots.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.lot_name || `Lot ${lot.lot_number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-4 flex items-center justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => removeRow(type, row.id)}
                  disabled={rows.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="p-3 bg-muted border-t">
            <div className={cn(
              "grid gap-2",
              showAddressColumn ? "grid-cols-20" : "grid-cols-16"
            )}>
              <div className="col-span-9 font-medium whitespace-nowrap">{tabLabel}</div>
              <div className="col-span-3 font-medium">
                {formatCurrency(tabTotal)}
              </div>
              <div className={showAddressColumn ? "col-span-8" : "col-span-4"}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Check</DialogTitle>
            <DialogDescription>Loading check data...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Check</DialogTitle>
          <DialogDescription>Make changes to this check.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <DateInputPicker
                date={checkDate}
                onDateChange={(date) => setCheckDate(date)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pay To</Label>
              <Input
                value={payTo}
                onChange={(e) => setPayTo(e.target.value)}
                placeholder="Payee name"
              />
            </div>
            <div className="space-y-2">
              <Label>Check #</Label>
              <Input
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="Check #"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Input
                value={bankAccount}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Memo</Label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Memo"
            />
          </div>

          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="job_cost">Job Cost</TabsTrigger>
              </TabsList>
              <TabsContent value="expense" className="space-y-4">
                {renderLineItems('expense')}
              </TabsContent>
              <TabsContent value="job_cost" className="space-y-4">
                {renderLineItems('job_cost')}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm font-medium">
                Check Total: {formatCurrency(calculateTotal())}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving || isLoading}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
