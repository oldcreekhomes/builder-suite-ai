import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSearchInputInline } from "@/components/AccountSearchInputInline";
import { JobSearchInput } from "@/components/JobSearchInput";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";
import { useAccounts } from "@/hooks/useAccounts";
import { useDeposits, DepositData, DepositLineData } from "@/hooks/useDeposits";
import { useProjectCheckSettings } from "@/hooks/useProjectCheckSettings";
import { toast } from "@/hooks/use-toast";
import { DepositSourceSearchInput } from "@/components/DepositSourceSearchInput";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";
import { AttachmentFilesRow } from "@/components/accounting/AttachmentFilesRow";
import { useDepositAttachments } from "@/hooks/useDepositAttachments";

interface DepositRow {
  id: string;
  account: string;
  accountId?: string;
  project: string;
  projectId?: string;
  quantity?: string;
  amount: string;
  memo: string;
}

export default function MakeDeposits() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [depositDate, setDepositDate] = useState<Date>(new Date());
  const [depositSourceId, setDepositSourceId] = useState<string>("");
  const [depositSourceName, setDepositSourceName] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("other");
  const [currentDepositId, setCurrentDepositId] = useState<string | null>(null);
  
  // Company information state - reuse from check settings
  const [companyName, setCompanyName] = useState<string>("Your Company Name");
  const [companyAddress, setCompanyAddress] = useState<string>("123 Business Street");
  const [companyCityState, setCompanyCityState] = useState<string>("City, State 12345");
  
  // Bank details state
  const [routingNumber, setRoutingNumber] = useState<string>("123456789");
  const [accountNumber, setAccountNumber] = useState<string>("1234567890");
  const [bankName, setBankName] = useState<string>("Your Bank Name");
  
  const [revenueRows, setRevenueRows] = useState<DepositRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
  ]);
  
  const [otherRows, setOtherRows] = useState<DepositRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }
  ]);

  const { data: project } = useProject(projectId || "");
  const { accounts } = useAccounts();
  const { createDeposit } = useDeposits();
  const { settings } = useProjectCheckSettings(projectId);
  const { costCodes } = useCostCodeSearch();
  
  // Attachment management
  const { 
    attachments, 
    isLoading: isLoadingAttachments, 
    isUploading, 
    uploadFiles, 
    deleteFile 
  } = useDepositAttachments(currentDepositId);

  // Load saved settings when available (reuse check settings for company info)
  useEffect(() => {
    if (settings) {
      if (settings.company_name) setCompanyName(settings.company_name);
      if (settings.company_address) setCompanyAddress(settings.company_address);
      if (settings.company_city_state) setCompanyCityState(settings.company_city_state);
    }
  }, [settings]);

  const addRevenueRow = () => {
    const newRow: DepositRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      quantity: "1",
      amount: "",
      memo: ""
    };
    setRevenueRows([...revenueRows, newRow]);
  };

  const removeRevenueRow = (id: string) => {
    if (revenueRows.length > 1) {
      setRevenueRows(revenueRows.filter(row => row.id !== id));
    }
  };

  const updateRevenueRow = (id: string, field: keyof DepositRow, value: string) => {
    setRevenueRows(revenueRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addOtherRow = () => {
    const newRow: DepositRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      quantity: "1",
      amount: "",
      memo: ""
    };
    setOtherRows([...otherRows, newRow]);
  };

  const removeOtherRow = (id: string) => {
    if (otherRows.length > 1) {
      setOtherRows(otherRows.filter(row => row.id !== id));
    }
  };

  const updateOtherRow = (id: string, field: keyof DepositRow, value: string) => {
    setOtherRows(otherRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const handleClear = () => {
    setRevenueRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }]);
    setOtherRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "1", amount: "", memo: "" }]);
    setCheckNumber("");
  };

  const calculateTotal = () => {
    const revenueTotal = revenueRows.reduce((sum, row) => {
      const q = parseFloat(row.quantity || "0") || 0;
      const c = parseFloat(row.amount) || 0;
      return sum + q * c;
    }, 0);
    
    const otherTotal = otherRows.reduce((sum, row) => {
      const q = parseFloat(row.quantity || "0") || 0;
      const c = parseFloat(row.amount) || 0;
      return sum + q * c;
    }, 0);
    
    return (revenueTotal + otherTotal).toFixed(2);
  };

  const getDisplayAmount = () => {
    const amount = calculateTotal();
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

  // Helpers to resolve typed inputs to IDs (copied from WriteChecks)
  const normalize = (s: string) => s.trim().toLowerCase();

  const extractLeadingCode = (text: string): string | null => {
    if (!text) return null;
    const trimmed = text.trim();
    const dashIdx = trimmed.indexOf("-");
    if (dashIdx > 0) {
      const left = trimmed.slice(0, dashIdx).trim();
      if (/^\d+[A-Za-z0-9.]*$/.test(left)) return left;
    }
    const match = trimmed.match(/^[A-Za-z0-9.]+/);
    return match ? match[0] : null;
  };

  const findCostCodeIdFromText = (text: string | undefined): string | undefined => {
    if (!text) return undefined;
    const leading = extractLeadingCode(text);
    if (leading) {
      const exact = costCodes.find(cc => cc.code.toLowerCase() === leading.toLowerCase());
      if (exact) return exact.id;
    }
    const q = normalize(text);
    const matches = costCodes.filter(cc =>
      cc.code.toLowerCase().includes(q) || cc.name.toLowerCase().includes(q)
    );
    return matches.length === 1 ? matches[0].id : undefined;
  };

  const findAccountIdFromText = (text: string | undefined): string | undefined => {
    if (!text) return undefined;
    const leading = extractLeadingCode(text);
    if (leading) {
      const exact = (accounts as any[]).find(acc => String(acc.code || "").toLowerCase() === leading.toLowerCase());
      if (exact) return String(exact.id);
    }
    const q = normalize(text);
    const matches = (accounts as any[]).filter(acc =>
      String(acc.code || "").toLowerCase().includes(q) || String(acc.name || "").toLowerCase().includes(q)
    );
    return matches.length === 1 ? String(matches[0].id) : undefined;
  };

  const amountOfRow = (row: DepositRow) => ((parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0));

  const resolveRowsForSave = (rows: DepositRow[], kind: 'revenue' | 'other'): DepositRow[] => {
    return rows.map(row => {
      const amt = amountOfRow(row);
      let resolvedAccountId = row.accountId;
      if (amt > 0 && !resolvedAccountId) {
        resolvedAccountId = kind === 'revenue' ? findCostCodeIdFromText(row.account) : findAccountIdFromText(row.account);
      }
      return {
        ...row,
        accountId: resolvedAccountId,
        projectId: row.projectId || (projectId || ""),
      };
    });
  };

  const handleSave = async (saveAndNew: boolean = false) => {
    // Validate required fields
    if (!depositSourceName) {
      toast({
        title: "Validation Error",
        description: "Please enter who the deposit is from",
        variant: "destructive",
      });
      return;
    }

    // Auto-resolve bank account if typed
    let resolvedBankAccountId = bankAccountId;
    if (!resolvedBankAccountId && bankAccount) {
      resolvedBankAccountId = findAccountIdFromText(bankAccount) || "";
    }

    if (!resolvedBankAccountId) {
      toast({
        title: "Validation Error",
        description: "Please select a bank account from the dropdown",
        variant: "destructive",
      });
      return;
    }

    // Auto-resolve typed selections
    const resolvedRevenueRows = resolveRowsForSave(revenueRows, 'revenue');
    const resolvedOtherRows = resolveRowsForSave(otherRows, 'other');

    // Validate we have at least one row with valid data
    const allRows = [...resolvedRevenueRows, ...resolvedOtherRows];
    const validRows = allRows.filter(row => row.accountId && amountOfRow(row) > 0);

    if (validRows.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one account from the dropdown and enter an amount greater than zero",
        variant: "destructive",
      });
      return;
    }

    // Build deposit lines from Chart of Accounts rows (revenue)
    const chartLines: DepositLineData[] = resolvedOtherRows
      .filter(row => row.accountId && amountOfRow(row) > 0)
      .map(row => ({
        line_type: 'revenue' as const,
        account_id: row.accountId!,
        project_id: row.projectId || projectId || undefined,
        amount: amountOfRow(row),
        memo: row.memo || undefined
      }));

    // Build deposit lines from Job Cost rows (customer_payment)
    // For Job Cost, pass cost_code_id (not account_id - hook will map to Equity 2905)
    const jobCostLines: DepositLineData[] = resolvedRevenueRows
      .filter(row => row.accountId && amountOfRow(row) > 0)
      .map(row => ({
        line_type: 'customer_payment' as const,
        cost_code_id: row.accountId!,  // This is actually the cost code ID
        project_id: row.projectId || projectId || undefined,
        amount: amountOfRow(row),
        memo: row.memo || undefined
      }));
    
    // Combine all lines
    const depositLines: DepositLineData[] = [...chartLines, ...jobCostLines];

    const depositAmount = parseFloat(calculateTotal());

    const depositData: DepositData = {
      deposit_date: depositDate.toISOString().split('T')[0],
      bank_account_id: resolvedBankAccountId,
      project_id: projectId || undefined,
      amount: depositAmount,
      memo: depositSourceName,
      deposit_source_id: depositSourceId || undefined,
      check_number: checkNumber || undefined,
      company_name: companyName,
      company_address: companyAddress,
      company_city_state: companyCityState,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number: accountNumber
    };

    try {
      const result = await createDeposit.mutateAsync({ depositData, depositLines });
      
      // Set the deposit ID for attachments
      if (result?.id) {
        setCurrentDepositId(result.id);
      }
      
      if (saveAndNew) {
        // Reset form for new deposit after a brief delay to allow attachment uploads
        setTimeout(() => {
          setDepositSourceId("");
          setDepositSourceName("");
          setCheckNumber("");
          handleClear();
          setCurrentDepositId(null);
        }, 500);
      } else {
        // Navigate back
        navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
    }
  };


  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Make Deposits" 
            projectId={projectId}
          />
          
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Card className="max-w-6xl mx-auto">
              <CardContent className="p-8">
                {/* Deposit Slip Header */}
                <div className="border-b pb-4 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold">DEPOSIT</h1>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="depositDate" className="text-sm whitespace-nowrap">Date:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "justify-start text-left font-normal",
                              !depositDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {depositDate ? format(depositDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={depositDate}
                            onSelect={(date) => date && setDepositDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Deposit Information */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">

                  <div className="md:col-span-5 space-y-2">
                    <Label htmlFor="bankAccount">Deposit To (Bank Account)</Label>
                    <AccountSearchInputInline
                      value={bankAccount}
                      onChange={(v) => { setBankAccount(v); if (!v) setBankAccountId(""); }}
                      onAccountSelect={(account) => {
                        setBankAccountId(account.id);
                        setBankAccount(`${account.code} - ${account.name}`);
                      }}
                      accountType="asset"
                      placeholder="Select bank account"
                    />
                  </div>

                  <div className="md:col-span-5 space-y-2">
                    <Label htmlFor="receivedFrom">Received From</Label>
                    <DepositSourceSearchInput
                      value={depositSourceName}
                      onChange={setDepositSourceName}
                      onSourceSelect={(sourceId, sourceName) => {
                        setDepositSourceId(sourceId);
                        setDepositSourceName(sourceName);
                      }}
                      placeholder="Search or add customer"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="checkNumber">Check #</Label>
                    <Input
                      id="checkNumber"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      placeholder="Optional"
                      maxLength={10}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Deposit Details Section */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-medium">Deposit Details</h3>
                      <TabsList className="grid grid-cols-2 w-auto">
                        <TabsTrigger value="other">Chart of Accounts</TabsTrigger>
                        <TabsTrigger value="revenue">Job Cost</TabsTrigger>
                      </TabsList>
                    </div>
                    <Button 
                      onClick={activeTab === "other" ? addOtherRow : addRevenueRow} 
                      size="sm" 
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>
                    
                    <TabsContent value="other" className="space-y-4">

                      <div className="border rounded-lg overflow-visible">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-3">Account</div>
                          <div className="col-span-5">Description</div>
                          <div className="col-span-1">Quantity</div>
                          <div className="col-span-1">Cost</div>
                          <div className="col-span-1">Total</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {otherRows.map((row) => (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                            <div className="col-span-3">
                              <AccountSearchInputInline
                                value={row.account}
                                onChange={(value) => {
                                  updateOtherRow(row.id, "account", value);
                                  // Clear accountId when manually typing to force selection from dropdown
                                  if (!value) {
                                    updateOtherRow(row.id, "accountId", "");
                                  }
                                }}
                                onAccountSelect={(account) => {
                                  updateOtherRow(row.id, "accountId", account.id);
                                  updateOtherRow(row.id, "account", `${account.code} - ${account.name}`);
                                }}
                                placeholder="Select account..."
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-5">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateOtherRow(row.id, "memo", e.target.value)}
                                placeholder="Description..."
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.quantity || "1"}
                                onChange={(e) => updateOtherRow(row.id, "quantity", e.target.value)}
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
                                  onChange={(e) => updateOtherRow(row.id, "amount", e.target.value)}
                                  placeholder="0.00"
                                  className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center">
                              <span className="text-sm font-medium">
                                ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="col-span-1 flex justify-center items-center">
                              <Button
                                onClick={() => removeOtherRow(row.id)}
                                size="sm"
                                variant="destructive"
                                disabled={otherRows.length === 1}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="revenue" className="space-y-4">

                      <div className="border rounded-lg overflow-visible">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-3">Cost Code</div>
                          <div className="col-span-5">Description</div>
                          <div className="col-span-1">Quantity</div>
                          <div className="col-span-1">Cost</div>
                          <div className="col-span-1">Total</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {revenueRows.map((row) => (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                            <div className="col-span-3">
                              <CostCodeSearchInput
                                value={row.account}
                                onChange={(value) => {
                                  updateRevenueRow(row.id, "account", value);
                                  // Clear accountId when manually typing to force selection from dropdown
                                  if (!value) {
                                    updateRevenueRow(row.id, "accountId", "");
                                  }
                                }}
                                onCostCodeSelect={(costCode) => {
                                  updateRevenueRow(row.id, "accountId", costCode.id);
                                  updateRevenueRow(row.id, "account", `${costCode.code} - ${costCode.name}`);
                                }}
                                placeholder="Select cost code..."
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-5">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateRevenueRow(row.id, "memo", e.target.value)}
                                placeholder="Description..."
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.quantity || "1"}
                                onChange={(e) => updateRevenueRow(row.id, "quantity", e.target.value)}
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
                                  onChange={(e) => updateRevenueRow(row.id, "amount", e.target.value)}
                                  placeholder="0.00"
                                  className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex items-center">
                              <span className="text-sm font-medium">
                                ${((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="col-span-1 flex justify-center items-center">
                              <Button
                                onClick={() => removeRevenueRow(row.id)}
                                size="sm"
                                variant="destructive"
                                disabled={revenueRows.length === 1}
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

                  {/* Attachments Section */}
                  <div className="mt-4">
                    <AttachmentFilesRow
                      files={attachments}
                      onFileUpload={(files) => currentDepositId && uploadFiles(files)}
                      onDeleteFile={deleteFile}
                      isReadOnly={!currentDepositId}
                      isUploading={isUploading}
                      entityType="deposit"
                    />
                  </div>
                   
                  <div className="p-3 bg-muted border rounded-lg">
                    <div className="flex justify-between items-center">
                      <div className="text-base font-semibold">
                        Total: ${getDisplayAmount()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClear} size="sm" className="h-8">
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleSave(true)}
                          disabled={createDeposit.isPending}
                        >
                          {createDeposit.isPending ? "Saving..." : "Save & New"}
                        </Button>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleSave(false)}
                          disabled={createDeposit.isPending}
                        >
                          {createDeposit.isPending ? "Saving..." : "Save & Close"}
                        </Button>
                      </div>
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
