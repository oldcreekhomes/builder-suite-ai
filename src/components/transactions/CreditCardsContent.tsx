import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteButton } from "@/components/ui/delete-button";
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarIcon } from "lucide-react";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { useCreditCards, type CreditCardLineData } from "@/hooks/useCreditCards";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";
import { useAccounts } from "@/hooks/useAccounts";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";

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
  const { costCodes, loading: costCodesLoading } = useCostCodeSearch();
  const { accounts } = useAccounts();
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);

  const [transactionType, setTransactionType] = useState<'purchase' | 'refund'>('purchase');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [creditCardAccount, setCreditCardAccount] = useState('');
  const [creditCardAccountId, setCreditCardAccountId] = useState('');
  const [vendor, setVendor] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [expenseRows, setExpenseRows] = useState<CreditCardRow[]>([
    { id: crypto.randomUUID(), amount: '0.00' }
  ]);
  const [jobCostRows, setJobCostRows] = useState<CreditCardRow[]>([
    { id: crypto.randomUUID(), amount: '0.00' }
  ]);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isViewingMode, setIsViewingMode] = useState(false);
  const [currentCreditCardId, setCurrentCreditCardId] = useState<string | null>(null);

  const addExpenseRow = () => {
    setExpenseRows([...expenseRows, { id: crypto.randomUUID(), amount: '0.00' }]);
  };

  const removeExpenseRow = (id: string) => {
    if (expenseRows.length > 1) {
      setExpenseRows(expenseRows.filter(row => row.id !== id));
    }
  };

  const updateExpenseRow = (id: string, updates: Partial<CreditCardRow>) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { ...row, ...updates } : row
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

  const updateJobCostRow = (id: string, updates: Partial<CreditCardRow>) => {
    setJobCostRows(jobCostRows.map(row => 
      row.id === id ? { ...row, ...updates } : row
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
    setVendorId('');
    setSelectedProjectId('');
    setExpenseRows([{ id: crypto.randomUUID(), amount: '0.00' }]);
    setJobCostRows([{ id: crypto.randomUUID(), amount: '0.00' }]);
    setCurrentIndex(-1);
    setIsViewingMode(false);
    setCurrentCreditCardId(null);
  };

  const createNewTransaction = () => {
    setCurrentIndex(-1);
    setIsViewingMode(false);
    setCurrentCreditCardId(null);
    clearForm();
  };

  const goToPrevious = () => {
    if (currentIndex === -1) {
      // Currently viewing "new", go to most recent
      if (creditCards.length > 0) {
        navigateToTransaction(0);
      }
    } else if (currentIndex < creditCards.length - 1) {
      navigateToTransaction(currentIndex + 1);
    }
  };

  const goToNext = () => {
    if (currentIndex > 0) {
      navigateToTransaction(currentIndex - 1);
    } else if (currentIndex === 0) {
      createNewTransaction();
    }
  };

  const handleDelete = async () => {
    if (!currentCreditCardId) return;
    
    await deleteCreditCard.mutateAsync(currentCreditCardId);
    createNewTransaction();
  };

  const handleSave = async (saveAndNew: boolean) => {
    if (!creditCardAccountId) {
      toast({
        title: "Validation Error",
        description: "Please select a credit card account",
        variant: "destructive",
      });
      return;
    }

    if (!vendor.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a vendor",
        variant: "destructive",
      });
      return;
    }

    // Check if cost codes are still loading
    if (costCodesLoading) {
      toast({
        title: "Please Wait",
        description: "Cost codes are still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    // Auto-resolve typed cost codes before validation
    const updatedJobCostRows = jobCostRows.map(row => {
      const amount = parseFloat(row.amount) || 0;
      if (amount > 0 && !row.costCodeId && row.costCode && row.costCode.trim()) {
        const typed = row.costCode.trim();
        
        // Try exact code match (case-insensitive)
        let match = costCodes.find(cc => 
          cc.code.toLowerCase() === typed.split(' - ')[0].toLowerCase()
        );
        
        // Try full "code - name" match
        if (!match) {
          match = costCodes.find(cc => 
            `${cc.code} - ${cc.name}`.toLowerCase() === typed.toLowerCase() ||
            `${cc.code}${cc.name}`.toLowerCase() === typed.toLowerCase()
          );
        }
        
        // Try partial match if unique
        if (!match) {
          const partialMatches = costCodes.filter(cc =>
            cc.code.toLowerCase().includes(typed.toLowerCase()) ||
            cc.name.toLowerCase().includes(typed.toLowerCase())
          );
          if (partialMatches.length === 1) {
            match = partialMatches[0];
          }
        }
        
        if (match) {
          return {
            ...row,
            costCodeId: match.id,
            costCode: `${match.code} - ${match.name}`
          };
        }
      }
      return row;
    });

    // Update state with resolved cost codes so UI reflects the matches
    if (updatedJobCostRows.some((row, idx) => row.costCodeId !== jobCostRows[idx].costCodeId)) {
      setJobCostRows(updatedJobCostRows);
    }

    const lines: CreditCardLineData[] = [];

    expenseRows.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      if (amount > 0 && row.accountId) {
        lines.push({
          line_type: 'expense',
          account_id: row.accountId,
          project_id: projectId,
          amount,
          memo: row.memo,
        });
      }
    });

    updatedJobCostRows.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      if (amount > 0 && row.costCodeId) {
        lines.push({
          line_type: 'job_cost',
          cost_code_id: row.costCodeId,
          project_id: projectId,
          amount,
          memo: row.memo,
        });
      }
    });

    if (lines.length === 0) {
      // Find first invalid row for better error message
      let errorDetail = "Please add at least one line item with an amount. ";
      
      const invalidExpense = expenseRows.find(r => parseFloat(r.amount) > 0 && !r.accountId);
      const invalidJobCost = updatedJobCostRows.find(r => parseFloat(r.amount) > 0 && !r.costCodeId);
      
      const hasEmptyAmounts = [...expenseRows, ...updatedJobCostRows].some(r => 
        !r.amount || parseFloat(r.amount) === 0
      );
      if (hasEmptyAmounts && !invalidExpense && !invalidJobCost) {
        errorDetail += "Please enter amounts for your line items.";
      }
      
      if (invalidExpense) {
        errorDetail += "You have an expense row with an amount but no account selected. ";
      }
      if (invalidJobCost) {
        errorDetail += "You have a job cost row with an amount but the cost code wasn't selected from the dropdown. ";
      }
      
      toast({
        title: "Validation Error",
        description: errorDetail + "Make sure to SELECT items from the dropdown list, not just type them.",
        variant: "destructive",
      });
      return;
    }

    await createCreditCard.mutateAsync({
      transaction_date: transactionDate,
      transaction_type: transactionType,
      credit_card_account_id: creditCardAccountId,
      vendor,
      project_id: selectedProjectId || undefined,
      amount: calculateTotal(),
      lines,
    });

    if (saveAndNew) {
      createNewTransaction();
    }
  };

  const navigateToTransaction = (index: number) => {
    if (index < 0 || index >= creditCards.length) return;

    const card = creditCards[index];
    setCurrentIndex(index);
    setIsViewingMode(true);
    setCurrentCreditCardId(card.id);
    setTransactionType(card.transaction_type as 'purchase' | 'refund');
    setTransactionDate(card.transaction_date);
    // Set credit card account ID and display text
    const creditCardAcct = accounts.find(a => a.id === card.credit_card_account_id);
    if (creditCardAcct) {
      setCreditCardAccountId(creditCardAcct.id);
      setCreditCardAccount(`${creditCardAcct.code} - ${creditCardAcct.name}`);
    } else {
      setCreditCardAccountId('');
      setCreditCardAccount('');
    }

    // Set vendor
    setVendor(card.vendor);
    setVendorId(''); // Vendor is stored as text, not a company ID
    setSelectedProjectId(card.project_id || '');

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
        // Populate account display text from accounts data
        if (line.account_id) {
          const account = accounts.find(a => a.id === line.account_id);
          if (account) {
            row.account = `${account.code} - ${account.name}`;
          }
        }
        expenseLines.push(row);
      } else {
        row.costCodeId = line.cost_code_id;
        // Populate cost code display text from costCodes data
        if (line.cost_code_id) {
          const costCode = costCodes.find(cc => cc.id === line.cost_code_id);
          if (costCode) {
            row.costCode = `${costCode.code} - ${costCode.name}`;
          }
        }
        jobCostLines.push(row);
      }
    });

    setExpenseRows(expenseLines.length > 0 ? expenseLines : [{ id: crypto.randomUUID(), amount: '0.00' }]);
    setJobCostRows(jobCostLines.length > 0 ? jobCostLines : [{ id: crypto.randomUUID(), amount: '0.00' }]);
  };

  return (
    <Card className="p-6">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header with Navigation */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Credit Card Transaction</h2>
            
            <div className="flex items-center gap-4">
              {/* Navigation Controls Group */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={createNewTransaction} 
                  size="sm" 
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={goToPrevious} 
                      size="sm" 
                      variant="outline" 
                      disabled={(currentIndex >= creditCards.length - 1 && currentIndex !== -1) || creditCards.length === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Older transaction</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={goToNext} 
                      size="sm" 
                      variant="outline" 
                      disabled={currentIndex <= 0 || creditCards.length === 0}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Newer transaction</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      {currentCreditCardId && isViewingMode && !isDateLocked(transactionDate) ? (
                        <DeleteButton
                          onDelete={handleDelete}
                          title="Delete Credit Card Transaction"
                          description="Are you sure you want to delete this credit card transaction? This action cannot be undone."
                          size="sm"
                          variant="ghost"
                          isLoading={deleteCreditCard.isPending}
                        />
                      ) : currentCreditCardId && isViewingMode && isDateLocked(transactionDate) ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                        >
                          <span className="text-lg">🔒</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          className="opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TooltipTrigger>
                  {(!currentCreditCardId || !isViewingMode) && (
                    <TooltipContent>
                      <p>Navigate to a saved transaction to delete</p>
                    </TooltipContent>
                  )}
                  {currentCreditCardId && isViewingMode && isDateLocked(transactionDate) && (
                    <TooltipContent>
                      <p className="text-xs">Books are closed - cannot delete transactions dated on or before {latestClosedDate ? format(new Date(latestClosedDate), 'PP') : 'the closed period'}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
              
              {/* Type and Date Controls Group */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Type:</Label>
                  <ToggleGroup 
                    type="single" 
                    value={transactionType} 
                    onValueChange={(value) => value && setTransactionType(value as 'purchase' | 'refund')}
                    className="bg-muted p-1 rounded-md"
                  >
                    <ToggleGroupItem 
                      value="purchase" 
                      className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    >
                      Purchase
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="refund"
                      className="data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    >
                      Refund
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="date" className="text-sm whitespace-nowrap">Date:</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !transactionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {transactionDate ? format(new Date(transactionDate), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={new Date(transactionDate)}
                        onSelect={(date) => date && setTransactionDate(format(date, 'yyyy-MM-dd'))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

        {/* Transaction Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Credit Card Account *</Label>
            <AccountSearchInput
              value={creditCardAccount}
              onChange={setCreditCardAccount}
              onAccountSelect={(account) => {
                setCreditCardAccountId(account.id);
                setCreditCardAccount(`${account.code} - ${account.name}`);
              }}
              placeholder="Select credit card account"
            />
          </div>
          <div>
            <Label htmlFor="vendor">Vendor *</Label>
            <VendorSearchInput
              value={vendor}
              onChange={setVendor}
              onCompanySelect={(company) => {
                setVendor(company.company_name);
              }}
              placeholder="Search vendors..."
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
                  <div className="col-span-5">
                    <Label>Account</Label>
                    <AccountSearchInput
                      value={row.account || ''}
                      onChange={(value) => updateExpenseRow(row.id, { account: value })}
                      onAccountSelect={(account) => {
                        updateExpenseRow(row.id, {
                          accountId: account.id,
                          account: `${account.code} - ${account.name}`
                        });
                      }}
                      placeholder="Select account"
                    />
                  </div>
                  <div className="col-span-4">
                    <Label>Memo</Label>
                    <Input
                      value={row.memo || ''}
                      onChange={(e) => updateExpenseRow(row.id, { memo: e.target.value })}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateExpenseRow(row.id, { amount: e.target.value })}
                      placeholder="0.00"
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
              {jobCostRows.map((row) => {
                const amount = parseFloat(row.amount) || 0;
                const isInvalid = amount > 0 && !row.costCodeId && row.costCode && row.costCode.trim();
                
                return (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Cost Code</Label>
                      <CostCodeSearchInput
                        value={row.costCode || ''}
                        onChange={(value) => updateJobCostRow(row.id, { costCode: value })}
                        onCostCodeSelect={(costCode) => {
                          updateJobCostRow(row.id, {
                            costCodeId: costCode.id,
                            costCode: `${costCode.code} - ${costCode.name}`
                          });
                        }}
                        placeholder="Select cost code"
                        className={isInvalid ? "ring-1 ring-destructive" : ""}
                      />
                      {isInvalid && (
                        <p className="text-xs text-destructive mt-1">
                          Select a cost code from the dropdown list
                        </p>
                      )}
                    </div>
                  <div className="col-span-4">
                    <Label>Memo</Label>
                    <Input
                      value={row.memo || ''}
                      onChange={(e) => updateJobCostRow(row.id, { memo: e.target.value })}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateJobCostRow(row.id, { amount: e.target.value })}
                      placeholder="0.00"
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
              );
            })}
            </div>
            <Button onClick={addJobCostRow} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </TabsContent>
        </Tabs>

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
      </TooltipProvider>
    </Card>
  );
}
