import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { format, addDays } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { useProject } from "@/hooks/useProject";
import { useAccounts } from "@/hooks/useAccounts";
import { useProjectSearch } from "@/hooks/useProjectSearch";
import { useChecks, CheckData, CheckLineData } from "@/hooks/useChecks";
import { toast } from "@/hooks/use-toast";

interface CheckRow {
  id: string;
  account: string;
  accountId?: string; // For storing cost code/account UUID
  project: string;
  projectId?: string; // For storing project UUID
  quantity?: string;
  amount: string; // unit cost
  memo: string;
}

export default function WriteChecks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payTo, setPayTo] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  
  // Company information state
  const [companyName, setCompanyName] = useState<string>("Your Company Name");
  const [companyAddress, setCompanyAddress] = useState<string>("123 Business Street");
  const [companyCityState, setCompanyCityState] = useState<string>("City, State 12345");
  
  // Dollar amount state (can override calculated total)
  const [manualAmount, setManualAmount] = useState<string>("");
  const [useManualAmount, setUseManualAmount] = useState<boolean>(false);
  
  // Bank details state
  const [routingNumber, setRoutingNumber] = useState<string>("123456789");
  const [accountNumber, setAccountNumber] = useState<string>("1234567890");
  const [bankName, setBankName] = useState<string>("Your Bank Name");
  
  const [jobCostRows, setJobCostRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
  ]);
  const [expenseRows, setExpenseRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
  ]);

  const { data: project } = useProject(projectId || "");
  const { accounts, accountingSettings } = useAccounts();
  const { projects } = useProjectSearch();
  const { createCheck } = useChecks();

  const addJobCostRow = () => {
    const newRow: CheckRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      quantity: "1",
      amount: "",
      memo: ""
    };
    setJobCostRows([...jobCostRows, newRow]);
  };

  const removeJobCostRow = (id: string) => {
    if (jobCostRows.length > 1) {
      setJobCostRows(jobCostRows.filter(row => row.id !== id));
    }
  };

  const updateJobCostRow = (id: string, field: keyof CheckRow, value: string) => {
    setJobCostRows(jobCostRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addExpenseRow = () => {
    const newRow: CheckRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      quantity: "1",
      amount: "",
      memo: ""
    };
    setExpenseRows([...expenseRows, newRow]);
  };
  const removeExpenseRow = (id: string) => {
    if (expenseRows.length > 1) {
      setExpenseRows(expenseRows.filter(row => row.id !== id));
    }
  };

  const updateExpenseRow = (id: string, field: keyof CheckRow, value: string) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const calculateTotal = () => {
    const jobCostTotal = jobCostRows.reduce((total, row) => {
      const q = parseFloat(row.quantity || "0") || 0;
      const c = parseFloat(row.amount) || 0;
      return total + q * c;
    }, 0);
    
    const expenseTotal = expenseRows.reduce((total, row) => {
      const q = parseFloat(row.quantity || "0") || 0;
      const c = parseFloat(row.amount) || 0;
      return total + q * c;
    }, 0);
    
    return (jobCostTotal + expenseTotal).toFixed(2);
  };

  const getDisplayAmount = () => {
    const amount = useManualAmount && manualAmount ? parseFloat(manualAmount).toFixed(2) : calculateTotal();
    return parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return "Zero";
    
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Million", "Billion"];

    const convertChunk = (n: number): string => {
      if (n === 0) return "";
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const tensDigit = Math.floor(n / 10);
        const onesDigit = n % 10;
        return tens[tensDigit] + (onesDigit ? " " + ones[onesDigit] : "");
      }
      const hundredsDigit = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundredsDigit] + " Hundred" + (remainder ? " " + convertChunk(remainder) : "");
    };

    const dollars = Math.floor(num);
    const cents = Math.round((num - dollars) * 100);

    let result = "";
    let chunkIndex = 0;
    let tempDollars = dollars;

    while (tempDollars > 0) {
      const chunk = tempDollars % 1000;
      if (chunk !== 0) {
        const chunkWords = convertChunk(chunk);
        result = chunkWords + (thousands[chunkIndex] ? " " + thousands[chunkIndex] : "") + (result ? " " + result : "");
      }
      tempDollars = Math.floor(tempDollars / 1000);
      chunkIndex++;
    }

    result = result || "Zero";
    result += " and " + cents.toString().padStart(2, "0") + "/100 Dollars";
    
    return result;
  };

  const handleSaveAndClose = async () => {
    if (!payTo) {
      toast({
        title: "Validation Error",
        description: "Please enter who the check is payable to",
        variant: "destructive",
      });
      return;
    }

    if (!bankAccount) {
      toast({
        title: "Validation Error",
        description: "Please select a bank account",
        variant: "destructive",
      });
      return;
    }

    const allRows = [...jobCostRows, ...expenseRows].filter(row => row.accountId && (row.amount || row.quantity));
    
      if (allRows.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select an account/cost code and enter an amount for each line item",
          variant: "destructive",
        });
        return;
      }

    // Prepare check lines
    const checkLines: CheckLineData[] = [
      ...jobCostRows
        .filter(row => row.accountId && (row.amount || row.quantity))
        .map(row => ({
          line_type: 'job_cost' as const,
          account_id: accountingSettings?.wip_account_id,
          cost_code_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: (parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0),
          memo: row.memo || undefined
        })),
      ...expenseRows
        .filter(row => row.accountId && (row.amount || row.quantity))
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: (parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0),
          memo: row.memo || undefined
        }))
    ];

    const totalAmount = parseFloat(getDisplayAmount());

    const checkData: CheckData = {
      check_number: checkNumber || undefined,
      check_date: checkDate.toISOString().split('T')[0],
      pay_to: payTo,
      bank_account_id: bankAccount,
      project_id: projectId || undefined,
      amount: totalAmount,
      company_name: companyName,
      company_address: companyAddress,
      company_city_state: companyCityState,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number: accountNumber
    };

    try {
      await createCheck.mutateAsync({ checkData, checkLines });
      navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
    } catch (error) {
      console.error('Error creating check:', error);
    }
  };

  const handleSaveAndNew = async () => {
    if (!payTo) {
      toast({
        title: "Validation Error",
        description: "Please enter who the check is payable to",
        variant: "destructive",
      });
      return;
    }

    if (!bankAccount) {
      toast({
        title: "Validation Error",
        description: "Please select a bank account",
        variant: "destructive",
      });
      return;
    }

    const allRows = [...jobCostRows, ...expenseRows].filter(row => row.accountId && (row.amount || row.quantity));
    
      if (allRows.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select an account/cost code and enter an amount for each line item",
          variant: "destructive",
        });
        return;
      }

    // Prepare check lines
    const checkLines: CheckLineData[] = [
      ...jobCostRows
        .filter(row => row.accountId && row.amount)
        .map(row => ({
          line_type: 'job_cost' as const,
          account_id: accountingSettings?.wip_account_id,
          cost_code_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || undefined
        })),
      ...expenseRows
        .filter(row => row.accountId && row.amount)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId,
          project_id: row.projectId || undefined,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || undefined
        }))
    ];

    const totalAmount = parseFloat(getDisplayAmount());

    const checkData: CheckData = {
      check_number: checkNumber || undefined,
      check_date: checkDate.toISOString().split('T')[0],
      pay_to: payTo,
      bank_account_id: bankAccount,
      project_id: projectId || undefined,
      amount: totalAmount,
      company_name: companyName,
      company_address: companyAddress,
      company_city_state: companyCityState,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number: accountNumber
    };

    try {
      await createCheck.mutateAsync({ checkData, checkLines });
      handleClear();
    } catch (error) {
      console.error('Error creating check:', error);
    }
  };

  const handleClear = () => {
    setCheckDate(new Date());
    setPayTo("");
    setCheckNumber("");
    setBankAccount("");
    setCompanyName("Your Company Name");
    setCompanyAddress("123 Business Street");
    setCompanyCityState("City, State 12345");
    setManualAmount("");
    setUseManualAmount(false);
    setRoutingNumber("123456789");
    setAccountNumber("1234567890");
    setBankName("Your Bank Name");
    setJobCostRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }]);
    setExpenseRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }]);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Write Checks" 
            projectId={projectId}
          />
          
          <div className="flex-1 p-6 space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                 {/* Check Header Information - Styled like a real check */}
                <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-dashed border-gray-300 rounded-lg p-6 space-y-4">
                  {/* Check header with date and check number */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 max-w-xl">
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="text-sm font-medium text-gray-800 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 w-full"
                          placeholder="Your Company Name"
                        />
                        <Input
                          value={companyAddress}
                          onChange={(e) => setCompanyAddress(e.target.value)}
                          className="text-xs text-gray-600 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 w-full"
                          placeholder="123 Business Street"
                        />
                        <Input
                          value={companyCityState}
                          onChange={(e) => setCompanyCityState(e.target.value)}
                          className="text-xs text-gray-600 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 w-full"
                          placeholder="City, State 12345"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-end">
                          <Label className="text-xs text-gray-600 mr-2">CHECK #</Label>
                          <Input 
                            value={checkNumber}
                            onChange={(e) => setCheckNumber(e.target.value)}
                            placeholder="001"
                            className="w-32 text-center border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent font-mono"
                          />
                        </div>
                        <div className="flex items-center justify-end">
                          <Label className="text-xs text-gray-600 mr-2">DATE</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-32 justify-start text-left font-normal border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent",
                                  !checkDate && "text-muted-foreground"
                                )}
                              >
                                {checkDate ? format(checkDate, "MM/dd/yyyy") : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-white shadow-lg border z-50" align="start">
                              <Calendar
                                mode="single"
                                selected={checkDate}
                                onSelect={setCheckDate}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                  {/* Pay to line */}
                  <div className="space-y-3">
                    {/* PAY TO THE ORDER OF line with $ amount box on the same line */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium whitespace-nowrap">PAY TO THE ORDER OF</span>
                        <div className="flex-1 border-b-2 border-gray-400">
                          <VendorSearchInput
                            value={payTo}
                            onChange={setPayTo}
                            placeholder="Enter payee name..."
                            className="border-0 bg-transparent h-8 text-lg font-medium"
                          />
                        </div>
                      </div>
                      <div className="border-2 border-gray-400 px-3 py-1 min-w-[140px] text-right relative">
                        <span className="text-sm text-gray-600">$</span>
                        <Input
                          type="text"
                          value={useManualAmount ? manualAmount : getDisplayAmount()}
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            if (!isNaN(Number(value)) || value === '') {
                              setManualAmount(value);
                              setUseManualAmount(true);
                            }
                          }}
                          onFocus={() => setUseManualAmount(true)}
                          className="inline-block w-24 text-xl font-bold ml-1 border-0 bg-transparent p-0 h-auto focus:ring-0 focus:border-0 text-right"
                          placeholder="0.00"
                        />
                        {useManualAmount && (
                          <button
                            onClick={() => {
                              setUseManualAmount(false);
                              setManualAmount("");
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-red-600"
                            title="Reset to calculated amount"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Written amount with DOLLARS label */}
                    <div className="flex items-center justify-between gap-2 border-b-2 border-gray-400 pb-1">
                      <span className="text-sm italic text-gray-700 pl-4 flex-1">
                        {numberToWords(parseFloat(getDisplayAmount()))}
                      </span>
                      <span className="text-sm font-medium pr-2">DOLLARS</span>
                    </div>

                    {/* Memo and signature aligned by bottom edge */}
                    <div className="flex items-end justify-between pt-8">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">MEMO</span>
                        <div className="w-64 border-b-2 border-gray-400 h-8">
                          <Input
                            placeholder="Optional memo..."
                            className="border-0 bg-transparent h-8 text-sm"
                          />
                        </div>
                      </div>
                        <div className="w-80 text-center relative">
                          <div className="border-b-2 border-gray-400 h-8"></div>
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-xs text-gray-600">Authorized Signature</span>
                        </div>
                    </div>
                  </div>

                  {/* Bank account */}
                  <div className="flex items-end justify-between pt-2">
                    <div className="space-y-2 flex-1 max-w-md">
                      <Label className="text-xs text-gray-600">BANK ACCOUNT</Label>
                      <AccountSearchInput
                        value={bankAccount}
                        onChange={setBankAccount}
                        placeholder="Select bank account..."
                        className="border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                        accountType="asset"
                        bankAccountsOnly={true}
                      />
                    </div>
                  </div>
                </div>

                {/* Expenses Section with Tabs */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Expenses</h3>
                  
                  <Tabs defaultValue="job-cost" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
                      <TabsTrigger value="expense">Expense</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="job-cost" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Button onClick={addJobCostRow} size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      </div>

                        <div className="border rounded-lg overflow-visible">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-2">Cost Code</div>
                          <div className="col-span-2">Project</div>
                          <div className="col-span-4">Memo</div>
                          <div className="col-span-1">Quantity</div>
                          <div className="col-span-1">Cost</div>
                          <div className="col-span-1">Total</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {jobCostRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                            <div className="col-span-2">
                              <CostCodeSearchInput
                                value={row.account}
                                onChange={(value) => updateJobCostRow(row.id, "account", value)}
                                onCostCodeSelect={(costCode) => {
                                  updateJobCostRow(row.id, "accountId", costCode.id);
                                  updateJobCostRow(row.id, "account", `${costCode.code} - ${costCode.name}`);
                                }}
                                placeholder="Select cost code..."
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <JobSearchInput
                                value={row.projectId || ""}
                                onChange={(projectId) => {
                                  updateJobCostRow(row.id, "projectId", projectId);
                                  // Find project address for display
                                  const project = projects?.find(p => p.id === projectId);
                                  updateJobCostRow(row.id, "project", project?.address || "");
                                }}
                                placeholder="Select project..."
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateJobCostRow(row.id, "memo", e.target.value)}
                                placeholder="Job cost memo"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.quantity || "1"}
                                onChange={(e) => updateJobCostRow(row.id, "quantity", e.target.value)}
                                placeholder="1"
                                className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="col-span-1">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.amount}
                                  onChange={(e) => updateJobCostRow(row.id, "amount", e.target.value)}
                                  placeholder="0.00"
                                  className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center">
                              <span className="text-sm font-medium">
                                ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toFixed(2)}
                              </span>
                            </div>
                            <div className="col-span-1 flex justify-center items-center">
                              <Button
                                onClick={() => removeJobCostRow(row.id)}
                                size="sm"
                                variant="destructive"
                                disabled={jobCostRows.length === 1}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="p-3 bg-muted border-t">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8 font-medium">Total:</div>
                            <div className="col-span-1 font-medium">
                              ${jobCostRows.reduce((total, row) => {
                                const q = parseFloat(row.quantity || "0") || 0;
                                const c = parseFloat(row.amount || "0") || 0;
                                return total + q * c;
                              }, 0).toFixed(2)}
                            </div>
                            <div className="col-span-3"></div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="expense" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Button onClick={addExpenseRow} size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-visible">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-2">Account</div>
                          <div className="col-span-2">Project</div>
                          <div className="col-span-4">Memo</div>
                          <div className="col-span-1">Quantity</div>
                          <div className="col-span-1">Cost</div>
                          <div className="col-span-1">Total</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {expenseRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                            <div className="col-span-2">
                              <AccountSearchInput
                                value={row.accountId || ""}
                                onChange={(accountId) => {
                                  updateExpenseRow(row.id, "accountId", accountId);
                                  // Find account name for display
                                  const account = accounts?.find(a => a.id === accountId);
                                  updateExpenseRow(row.id, "account", account ? `${account.code} - ${account.name}` : "");
                                }}
                                placeholder="Select account"
                                accountType="expense"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <JobSearchInput
                                value={row.projectId || ""}
                                onChange={(projectId) => {
                                  updateExpenseRow(row.id, "projectId", projectId);
                                  // Find project address for display
                                  const project = projects?.find(p => p.id === projectId);
                                  updateExpenseRow(row.id, "project", project?.address || "");
                                }}
                                placeholder="Select project"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateExpenseRow(row.id, "memo", e.target.value)}
                                placeholder="Expense memo"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.quantity || "1"}
                                onChange={(e) => updateExpenseRow(row.id, "quantity", e.target.value)}
                                placeholder="1"
                                className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="col-span-1">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={row.amount}
                                  onChange={(e) => updateExpenseRow(row.id, "amount", e.target.value)}
                                  placeholder="0.00"
                                  className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center">
                              <span className="text-sm font-medium">
                                ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toFixed(2)}
                              </span>
                            </div>
                            <div className="col-span-1 flex justify-center items-center">
                              <Button
                                onClick={() => removeExpenseRow(row.id)}
                                size="sm"
                                variant="destructive"
                                disabled={expenseRows.length === 1}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Total and Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-lg font-semibold">
                    Calculated Total: ${calculateTotal()}
                    {useManualAmount && (
                      <div className="text-sm text-gray-500">
                        (Check Amount: ${getDisplayAmount()})
                        <div className="p-3 bg-muted border-t">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8 font-medium">Total:</div>
                            <div className="col-span-1 font-medium">
                              ${expenseRows.reduce((total, row) => {
                                const q = parseFloat(row.quantity || "0") || 0;
                                const c = parseFloat(row.amount || "0") || 0;
                                return total + q * c;
                              }, 0).toFixed(2)}
                            </div>
                            <div className="col-span-3"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClear}>
                      Clear
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSaveAndNew}
                      disabled={createCheck.isPending}
                    >
                      {createCheck.isPending ? "Saving..." : "Save & New"}
                    </Button>
                    <Button 
                      onClick={handleSaveAndClose}
                      disabled={createCheck.isPending}
                    >
                      {createCheck.isPending ? "Saving..." : "Save & Close"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}