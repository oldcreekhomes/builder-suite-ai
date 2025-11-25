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
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarIcon, Search } from "lucide-react";
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
import { AttachmentFilesRow } from "@/components/accounting/AttachmentFilesRow";
import { useCreditCardAttachments } from "@/hooks/useCreditCardAttachments";
import { CreditCardSearchDialog } from "@/components/creditcards/CreditCardSearchDialog";

interface CreditCardRow {
  id: string;
  account?: string;
  accountId?: string;
  costCode?: string;
  costCodeId?: string;
  projectId?: string;
  amount: string;
  quantity?: string;
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
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [creditCardAccount, setCreditCardAccount] = useState('');
  const [creditCardAccountId, setCreditCardAccountId] = useState('');
  const [vendor, setVendor] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [expenseRows, setExpenseRows] = useState<CreditCardRow[]>([
    { id: crypto.randomUUID(), amount: '0.00', quantity: '1' }
  ]);
  const [jobCostRows, setJobCostRows] = useState<CreditCardRow[]>([
    { id: crypto.randomUUID(), amount: '0.00', quantity: '1' }
  ]);

  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isViewingMode, setIsViewingMode] = useState(false);
  const [currentCreditCardId, setCurrentCreditCardId] = useState<string | null>(null);

  // Search dialog state
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // Attachments
  const {
    attachments, 
    isLoading: isLoadingAttachments,
    isUploading,
    uploadFiles,
    deleteFile,
    finalizePendingAttachments
  } = useCreditCardAttachments(currentCreditCardId, `credit-card-draft-${Date.now()}`);

  const addExpenseRow = () => {
    setExpenseRows([...expenseRows, { id: crypto.randomUUID(), amount: '0.00', quantity: '1' }]);
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
    setJobCostRows([...jobCostRows, { id: crypto.randomUUID(), amount: '0.00', quantity: '1' }]);
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
    setTransactionDate(new Date());
    setCreditCardAccount('');
    setCreditCardAccountId('');
    setVendor('');
    setVendorId('');
    setSelectedProjectId('');
    setExpenseRows([{ id: crypto.randomUUID(), amount: '0.00', quantity: '1' }]);
    setJobCostRows([{ id: crypto.randomUUID(), amount: '0.00', quantity: '1' }]);
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

    if (costCodesLoading) {
      toast({
        title: "Please Wait",
        description: "Cost codes are still loading. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    const updatedJobCostRows = jobCostRows.map(row => {
      const amount = parseFloat(row.amount) || 0;
      if (amount > 0 && !row.costCodeId && row.costCode && row.costCode.trim()) {
        const typed = row.costCode.trim();
        
        let match = costCodes.find(cc => 
          cc.code.toLowerCase() === typed.split(' - ')[0].toLowerCase()
        );
        
        if (!match) {
          match = costCodes.find(cc => 
            `${cc.code} - ${cc.name}`.toLowerCase() === typed.toLowerCase() ||
            `${cc.code}${cc.name}`.toLowerCase() === typed.toLowerCase()
          );
        }
        
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

    const result = await createCreditCard.mutateAsync({
      transaction_date: transactionDate.toISOString().split('T')[0],
      transaction_type: transactionType,
      credit_card_account_id: creditCardAccountId,
      vendor,
      project_id: selectedProjectId || undefined,
      amount: calculateTotal(),
      lines,
    });

    // Finalize any pending attachments
    if (result?.id) {
      await finalizePendingAttachments(result.id);
      setCurrentCreditCardId(result.id);
    }

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
    setTransactionDate(new Date(card.transaction_date));
    
    const creditCardAcct = accounts.find(a => a.id === card.credit_card_account_id);
    if (creditCardAcct) {
      setCreditCardAccountId(creditCardAcct.id);
      setCreditCardAccount(`${creditCardAcct.code} - ${creditCardAcct.name}`);
    } else {
      setCreditCardAccountId('');
      setCreditCardAccount('');
    }

    setVendor(card.vendor);
    setVendorId('');
    setSelectedProjectId(card.project_id || '');

    const expenseLines: CreditCardRow[] = [];
    const jobCostLines: CreditCardRow[] = [];

    card.lines?.forEach((line: any) => {
      const row: CreditCardRow = {
        id: line.id,
        amount: line.amount.toString(),
        quantity: line.quantity?.toString() || '1',
        memo: line.memo || '',
        projectId: line.project_id,
      };

      if (line.line_type === 'expense') {
        row.accountId = line.account_id;
        if (line.account_id) {
          const account = accounts.find(a => a.id === line.account_id);
          if (account) {
            row.account = `${account.code} - ${account.name}`;
          }
        }
        expenseLines.push(row);
      } else {
        row.costCodeId = line.cost_code_id;
        if (line.cost_code_id) {
          const costCode = costCodes.find(cc => cc.id === line.cost_code_id);
          if (costCode) {
            row.costCode = `${costCode.code} - ${costCode.name}`;
          }
        }
        jobCostLines.push(row);
      }
    });

    setExpenseRows(expenseLines.length > 0 ? expenseLines : [{ id: crypto.randomUUID(), amount: '0.00', quantity: '1' }]);
    setJobCostRows(jobCostLines.length > 0 ? jobCostLines : [{ id: crypto.randomUUID(), amount: '0.00', quantity: '1' }]);
  };

  const handleCreditCardSelect = (creditCard: any) => {
    const index = creditCards.findIndex(cc => cc.id === creditCard.id);
    if (index !== -1) {
      navigateToTransaction(index);
    }
  };

  return (
    <Card className="p-6">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header with Navigation */}
          <div className="flex items-center justify-between border-b pb-4 mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">CREDIT CARD</h1>
              
              {/* Type Toggle */}
              <div className="flex items-center gap-2">
                <Label>Type:</Label>
                <ToggleGroup 
                  type="single" 
                  value={transactionType} 
                  onValueChange={(value) => value && setTransactionType(value as 'purchase' | 'refund')}
                  className="bg-muted p-0.5 rounded-md h-10"
                >
                  <ToggleGroupItem 
                    value="purchase" 
                    className="data-[state=on]:bg-background data-[state=on]:shadow-sm h-9"
                  >
                    Purchase
                  </ToggleGroupItem>
                  <ToggleGroupItem 
                    value="refund"
                    className="data-[state=on]:bg-background data-[state=on]:shadow-sm h-9"
                  >
                    Refund
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Navigation Controls */}
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-10"
                  onClick={() => setSearchDialogOpen(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                
                <Button 
                  onClick={createNewTransaction} 
                  size="sm" 
                  variant="outline"
                  className="h-10"
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
                      className="h-10 w-10 p-0"
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
                      className="h-10 w-10 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Newer transaction</p>
                  </TooltipContent>
                </Tooltip>
                
                {currentCreditCardId && isViewingMode && !isDateLocked(format(transactionDate, 'yyyy-MM-dd')) ? (
                  <DeleteButton
                    onDelete={handleDelete}
                    title="Delete Credit Card Transaction"
                    description="Are you sure you want to delete this credit card transaction? This action cannot be undone."
                    size="sm"
                    variant="destructive"
                    isLoading={deleteCreditCard.isPending}
                    className="h-10 w-10"
                  />
                ) : currentCreditCardId && isViewingMode && isDateLocked(format(transactionDate, 'yyyy-MM-dd')) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    className="h-10 w-10"
                  >
                    <span className="text-lg">🔒</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled
                    className="opacity-50 h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Date Picker */}
              <div className="flex items-center gap-2">
                <Label htmlFor="date" className="text-sm whitespace-nowrap">Date:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal h-10 flex items-center",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate ? format(transactionDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(date) => date && setTransactionDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Main Form Fields */}
          <div className="grid grid-cols-12 gap-2 p-3 !w-full">
              <div className="col-span-3">
                <Label>Credit Card Account</Label>
                <AccountSearchInput
                  value={creditCardAccount}
                  onChange={(value) => { 
                    setCreditCardAccount(value); 
                    if (!value) setCreditCardAccountId(""); 
                  }}
                  onAccountSelect={(account) => {
                    setCreditCardAccount(`${account.code} - ${account.name}`);
                    setCreditCardAccountId(account.id);
                  }}
                  placeholder="Select credit card account"
                  className="h-10"
                />
              </div>

              <div className="col-span-7">
                <Label>Vendor</Label>
                <VendorSearchInput
                  value={vendor}
                  onChange={setVendor}
                  onCompanySelect={(company) => {
                    setVendor(company.company_name);
                  }}
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="col-span-2 min-w-0">
                <Label>Attachments</Label>
                <AttachmentFilesRow
                  files={attachments}
                  onFileUpload={uploadFiles}
                  onDeleteFile={deleteFile}
                  isUploading={isUploading}
                  entityType="credit_card"
                />
              </div>

            </div>

          {/* Transaction Details Section */}
          <Tabs defaultValue="expense" className="space-y-4">
            <div className="grid grid-cols-12 gap-2 p-3">
              <div className="col-span-3">
                <TabsList className="grid grid-cols-2 w-auto">
                  <TabsTrigger value="expense">Chart of Accounts</TabsTrigger>
                  <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="expense" className="space-y-4">
              <div className="border rounded-lg overflow-visible">
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                  <div className="col-span-3">Account</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-1">Quantity</div>
                  <div className="col-span-1">Cost</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {expenseRows.map((row) => {
                  const quantity = parseFloat(row.quantity || '1') || 1;
                  const cost = parseFloat(row.amount) || 0;
                  const total = quantity * cost;
                  
                  return (
                    <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                      <div className="col-span-3">
                        <AccountSearchInput
                          value={row.account || ''}
                          onChange={(value) => {
                            updateExpenseRow(row.id, { account: value });
                            if (!value) {
                              updateExpenseRow(row.id, { accountId: '' });
                            }
                          }}
                          onAccountSelect={(account) => {
                            updateExpenseRow(row.id, {
                              accountId: account.id,
                              account: `${account.code} - ${account.name}`
                            });
                          }}
                          placeholder="Select account..."
                          className="h-10"
                        />
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.memo || ''}
                          onChange={(e) => updateExpenseRow(row.id, { memo: e.target.value })}
                          placeholder="Description..."
                          className="h-10"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="1"
                          value={row.quantity || '1'}
                          onChange={(e) => updateExpenseRow(row.id, { quantity: e.target.value })}
                          placeholder="1"
                          className="h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateExpenseRow(row.id, { amount: e.target.value })}
                            placeholder="0.00"
                            className="h-10 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="h-10 flex items-center justify-end px-3 bg-muted rounded-md font-medium">
                          ${total.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center items-center gap-1">
                        <Button
                          onClick={() => removeExpenseRow(row.id)}
                          size="sm"
                          variant="destructive"
                          disabled={expenseRows.length === 1}
                          className="h-10 w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                        <Button
                          type="button"
                          onClick={addExpenseRow}
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="job-cost" className="space-y-4">
              <div className="border rounded-lg overflow-visible">
                <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                  <div className="col-span-3">Cost Code</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-1">Quantity</div>
                  <div className="col-span-1">Cost</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {jobCostRows.map((row) => {
                  const amount = parseFloat(row.amount) || 0;
                  const isInvalid = amount > 0 && !row.costCodeId && row.costCode && row.costCode.trim();
                  const quantity = parseFloat(row.quantity || '1') || 1;
                  const cost = parseFloat(row.amount) || 0;
                  const total = quantity * cost;
                  
                  return (
                    <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                      <div className="col-span-3">
                        <CostCodeSearchInput
                          value={row.costCode || ''}
                          onChange={(value) => {
                            updateJobCostRow(row.id, { costCode: value });
                            if (!value) {
                              updateJobCostRow(row.id, { costCodeId: '' });
                            }
                          }}
                          onCostCodeSelect={(costCode) => {
                            updateJobCostRow(row.id, {
                              costCodeId: costCode.id,
                              costCode: `${costCode.code} - ${costCode.name}`
                            });
                          }}
                          placeholder="Select cost code..."
                          className={cn("h-10", isInvalid && "ring-1 ring-destructive")}
                        />
                        {isInvalid && (
                          <p className="text-xs text-destructive mt-1">
                            Select a cost code from the dropdown list
                          </p>
                        )}
                      </div>
                      <div className="col-span-5">
                        <Input
                          value={row.memo || ''}
                          onChange={(e) => updateJobCostRow(row.id, { memo: e.target.value })}
                          placeholder="Description..."
                          className="h-10"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          step="1"
                          value={row.quantity || '1'}
                          onChange={(e) => updateJobCostRow(row.id, { quantity: e.target.value })}
                          placeholder="1"
                          className="h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            value={row.amount}
                            onChange={(e) => updateJobCostRow(row.id, { amount: e.target.value })}
                            placeholder="0.00"
                            className="h-10 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <div className="h-10 flex items-center justify-end px-3 bg-muted rounded-md font-medium">
                          ${total.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center items-center gap-1">
                        <Button
                          onClick={() => removeJobCostRow(row.id)}
                          size="sm"
                          variant="destructive"
                          disabled={jobCostRows.length === 1}
                          className="h-10 w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                        <Button
                          type="button"
                          onClick={addJobCostRow}
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

            {/* Footer with Total and Actions */}
          <div className="p-3 bg-muted border rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-base font-semibold">
                Total: ${calculateTotal().toFixed(2)}
              </div>
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={clearForm} 
                  size="sm" 
                  className="h-10"
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => handleSave(true)}
                  disabled={createCreditCard.isPending}
                >
                  {createCreditCard.isPending ? "Saving..." : "Save & New"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-10"
                  onClick={() => handleSave(false)}
                  disabled={createCreditCard.isPending}
                >
                  {createCreditCard.isPending ? "Saving..." : "Save & Close"}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <CreditCardSearchDialog
          open={searchDialogOpen}
          onOpenChange={setSearchDialogOpen}
          creditCards={creditCards}
          isLoading={false}
          isDateLocked={isDateLocked}
          onCreditCardSelect={handleCreditCardSelect}
          onDeleteCreditCard={async (creditCardId) => {
            await deleteCreditCard.mutateAsync(creditCardId);
          }}
        />
      </TooltipProvider>
    </Card>
  );
}
