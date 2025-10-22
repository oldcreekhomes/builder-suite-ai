import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { useCreditCards, type CreditCardLineData } from "@/hooks/useCreditCards";
import { format } from "date-fns";

interface CreditCardRow {
  id: string;
  account?: string;
  accountId?: string;
  costCode?: string;
  costCodeId?: string;
  projectId?: string;
  amount: string;
  memo?: string;
}

interface CreditCardsContentProps {
  projectId?: string;
}

export function CreditCardsContent({ projectId }: CreditCardsContentProps) {
  const { creditCards, createCreditCard, deleteCreditCard } = useCreditCards();

  const [transactionType, setTransactionType] = useState<'purchase' | 'refund'>('purchase');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [creditCardAccount, setCreditCardAccount] = useState('');
  const [creditCardAccountId, setCreditCardAccountId] = useState('');
  const [vendor, setVendor] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [memo, setMemo] = useState('');

  const [expenseRows, setExpenseRows] = useState<CreditCardRow[]>([
    { id: crypto.randomUUID(), amount: '0.00' }
  ]);
  const [jobCostRows, setJobCostRows] = useState<CreditCardRow[]>([
    { id: crypto.randomUUID(), amount: '0.00' }
  ]);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isViewingMode, setIsViewingMode] = useState(false);

  const addExpenseRow = () => {
    setExpenseRows([...expenseRows, { id: crypto.randomUUID(), amount: '0.00' }]);
  };

  const removeExpenseRow = (id: string) => {
    if (expenseRows.length > 1) {
      setExpenseRows(expenseRows.filter(row => row.id !== id));
    }
  };

  const updateExpenseRow = (id: string, field: keyof CreditCardRow, value: string) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addJobCostRow = () => {
    setJobCostRows([...jobCostRows, { id: crypto.randomUUID(), amount: '0.00' }]);
  };

  const removeJobCostRow = (id: string) => {
    if (jobCostRows.length > 1) {
      setJobCostRows(jobCostRows.filter(row => row.id !== id));
    }
  };

  const updateJobCostRow = (id: string, field: keyof CreditCardRow, value: string) => {
    setJobCostRows(jobCostRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const calculateTotal = () => {
    const expenseTotal = expenseRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    const jobCostTotal = jobCostRows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
    return expenseTotal + jobCostTotal;
  };

  const clearForm = () => {
    setTransactionType('purchase');
    setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
    setCreditCardAccount('');
    setCreditCardAccountId('');
    setVendor('');
    setSelectedProjectId('');
    setMemo('');
    setExpenseRows([{ id: crypto.randomUUID(), amount: '0.00' }]);
    setJobCostRows([{ id: crypto.randomUUID(), amount: '0.00' }]);
    setCurrentIndex(-1);
    setIsViewingMode(false);
  };

  const handleSave = async (saveAndNew: boolean) => {
    if (!creditCardAccountId) {
      alert('Please select a credit card account');
      return;
    }

    if (!vendor.trim()) {
      alert('Please enter a vendor');
      return;
    }

    const lines: CreditCardLineData[] = [];

    expenseRows.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      if (amount > 0 && row.accountId) {
        lines.push({
          line_type: 'expense',
          account_id: row.accountId,
          project_id: row.projectId,
          amount,
          memo: row.memo,
        });
      }
    });

    jobCostRows.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      if (amount > 0 && row.costCodeId) {
        lines.push({
          line_type: 'job_cost',
          cost_code_id: row.costCodeId,
          project_id: row.projectId,
          amount,
          memo: row.memo,
        });
      }
    });

    if (lines.length === 0) {
      alert('Please add at least one line item with an amount');
      return;
    }

    await createCreditCard.mutateAsync({
      transaction_date: transactionDate,
      transaction_type: transactionType,
      credit_card_account_id: creditCardAccountId,
      vendor,
      project_id: selectedProjectId || undefined,
      amount: calculateTotal(),
      memo,
      lines,
    });

    if (saveAndNew) {
      clearForm();
    }
  };

  const navigateToTransaction = (index: number) => {
    if (index < 0 || index >= creditCards.length) return;

    const card = creditCards[index];
    setCurrentIndex(index);
    setIsViewingMode(true);
    setTransactionType(card.transaction_type as 'purchase' | 'refund');
    setTransactionDate(format(new Date(card.transaction_date), 'yyyy-MM-dd'));
    setCreditCardAccountId(card.credit_card_account_id);
    setVendor(card.vendor);
    setSelectedProjectId(card.project_id || '');
    setMemo(card.memo || '');

    const expenseLines: CreditCardRow[] = [];
    const jobCostLines: CreditCardRow[] = [];

    card.lines?.forEach((line: any) => {
      const row: CreditCardRow = {
        id: line.id,
        amount: line.amount.toString(),
        memo: line.memo || '',
        projectId: line.project_id,
      };

      if (line.line_type === 'expense') {
        row.accountId = line.account_id;
        expenseLines.push(row);
      } else {
        row.costCodeId = line.cost_code_id;
        jobCostLines.push(row);
      }
    });

    setExpenseRows(expenseLines.length > 0 ? expenseLines : [{ id: crypto.randomUUID(), amount: '0.00' }]);
    setJobCostRows(jobCostLines.length > 0 ? jobCostLines : [{ id: crypto.randomUUID(), amount: '0.00' }]);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Credit Card Transaction</h2>
            {creditCards.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateToTransaction(currentIndex - 1)}
                  disabled={currentIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {isViewingMode ? `${currentIndex + 1}/${creditCards.length}` : 'New'}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateToTransaction(currentIndex + 1)}
                  disabled={currentIndex >= creditCards.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <ToggleGroup 
                type="single" 
                value={transactionType} 
                onValueChange={(value) => value && setTransactionType(value as 'purchase' | 'refund')}
              >
                <ToggleGroupItem value="purchase">Purchase</ToggleGroupItem>
                <ToggleGroupItem value="refund">Refund</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Credit Card Account *</Label>
            <AccountSearchInput
              value={creditCardAccount}
              onChange={setCreditCardAccount}
              onAccountSelect={(account) => {
                setCreditCardAccountId(account.id);
                setCreditCardAccount(account.name);
              }}
              placeholder="Select credit card account"
            />
          </div>
          <div>
            <Label htmlFor="vendor">Vendor *</Label>
            <Input
              id="vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Enter vendor name"
            />
          </div>
          <div>
            <Label>Project (Optional)</Label>
            <JobSearchInput
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              placeholder="Select project"
            />
          </div>
        </div>

        {/* Line Items Tabs */}
        <Tabs defaultValue="expense">
          <TabsList>
            <TabsTrigger value="expense">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="expense" className="space-y-4">
            <div className="space-y-2">
              {expenseRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label>Account</Label>
                    <AccountSearchInput
                      value={row.account || ''}
                      onChange={(value) => updateExpenseRow(row.id, 'account', value)}
                      onAccountSelect={(account) => {
                        updateExpenseRow(row.id, 'accountId', account.id);
                        updateExpenseRow(row.id, 'account', account.name);
                      }}
                      placeholder="Select account"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Project (Optional)</Label>
                    <JobSearchInput
                      value={row.projectId || ''}
                      onChange={(value) => updateExpenseRow(row.id, 'projectId', value)}
                      placeholder="Select project"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateExpenseRow(row.id, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Memo</Label>
                    <Input
                      value={row.memo || ''}
                      onChange={(e) => updateExpenseRow(row.id, 'memo', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExpenseRow(row.id)}
                    disabled={expenseRows.length === 1}
                    className="col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={addExpenseRow} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </TabsContent>

          <TabsContent value="job-cost" className="space-y-4">
            <div className="space-y-2">
              {jobCostRows.map((row) => (
                <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label>Cost Code</Label>
                    <CostCodeSearchInput
                      value={row.costCode || ''}
                      onChange={(value) => updateJobCostRow(row.id, 'costCode', value)}
                      onCostCodeSelect={(costCode) => {
                        updateJobCostRow(row.id, 'costCodeId', costCode.id);
                        updateJobCostRow(row.id, 'costCode', costCode.name);
                      }}
                      placeholder="Select cost code"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Project (Optional)</Label>
                    <JobSearchInput
                      value={row.projectId || ''}
                      onChange={(value) => updateJobCostRow(row.id, 'projectId', value)}
                      placeholder="Select project"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateJobCostRow(row.id, 'amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Memo</Label>
                    <Input
                      value={row.memo || ''}
                      onChange={(e) => updateJobCostRow(row.id, 'memo', e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeJobCostRow(row.id)}
                    disabled={jobCostRows.length === 1}
                    className="col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button onClick={addJobCostRow} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </TabsContent>
        </Tabs>

        {/* Memo */}
        <div>
          <Label htmlFor="memo">Memo (Optional)</Label>
          <Input
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Additional notes"
          />
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="text-right">
            <Label>Total Amount</Label>
            <div className="text-2xl font-bold">${calculateTotal().toFixed(2)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={clearForm}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave(true)}>
              Save & New
            </Button>
            <Button onClick={() => handleSave(false)}>
              Save & Close
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
