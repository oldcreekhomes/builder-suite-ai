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
import { AccountSearchInputInline } from "@/components/AccountSearchInputInline";
import { JobSearchInput } from "@/components/JobSearchInput";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/hooks/useProject";
import { useAccounts } from "@/hooks/useAccounts";
import { useDeposits, DepositData, DepositLineData } from "@/hooks/useDeposits";
import { useProjectCheckSettings } from "@/hooks/useProjectCheckSettings";
import { toast } from "@/hooks/use-toast";

interface DepositRow {
  id: string;
  account: string;
  accountId?: string;
  project: string;
  projectId?: string;
  amount: string;
  memo: string;
}

export default function MakeDeposits() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [depositDate, setDepositDate] = useState<Date>(new Date());
  const [receivedFrom, setReceivedFrom] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  
  // Company information state - reuse from check settings
  const [companyName, setCompanyName] = useState<string>("Your Company Name");
  const [companyAddress, setCompanyAddress] = useState<string>("123 Business Street");
  const [companyCityState, setCompanyCityState] = useState<string>("City, State 12345");
  
  // Bank details state
  const [routingNumber, setRoutingNumber] = useState<string>("123456789");
  const [accountNumber, setAccountNumber] = useState<string>("1234567890");
  const [bankName, setBankName] = useState<string>("Your Bank Name");
  
  const [depositRows, setDepositRows] = useState<DepositRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", amount: "", memo: "" }
  ]);

  const { data: project } = useProject(projectId || "");
  const { accounts } = useAccounts();
  const { createDeposit } = useDeposits();
  const { settings } = useProjectCheckSettings(projectId);

  // Load saved settings when available (reuse check settings for company info)
  useEffect(() => {
    if (settings) {
      if (settings.company_name) setCompanyName(settings.company_name);
      if (settings.company_address) setCompanyAddress(settings.company_address);
      if (settings.company_city_state) setCompanyCityState(settings.company_city_state);
    }
  }, [settings]);

  const addDepositRow = () => {
    const newRow: DepositRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
      amount: "",
      memo: ""
    };
    setDepositRows([...depositRows, newRow]);
  };

  const removeDepositRow = (id: string) => {
    if (depositRows.length > 1) {
      setDepositRows(depositRows.filter(row => row.id !== id));
    }
  };

  const updateDepositRow = (id: string, field: keyof DepositRow, value: string) => {
    setDepositRows(depositRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const calculateTotal = () => {
    const total = depositRows.reduce((sum, row) => {
      const amount = parseFloat(row.amount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(2);
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

  const handleSave = async (saveAndNew: boolean = false) => {
    // Validate required fields
    if (!receivedFrom) {
      toast({
        title: "Validation Error",
        description: "Please enter who the deposit is from",
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

    // Filter and validate deposit rows
    const validRows = depositRows.filter(row => row.accountId && parseFloat(row.amount) > 0);
    
    if (validRows.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item with an account and amount",
        variant: "destructive",
      });
      return;
    }

    // Prepare deposit lines
    const depositLines: DepositLineData[] = validRows.map(row => ({
      line_type: 'revenue' as const,
      account_id: row.accountId,
      project_id: row.projectId || undefined,
      amount: parseFloat(row.amount),
      memo: row.memo || undefined
    }));

    const depositAmount = parseFloat(calculateTotal());

    const depositData: DepositData = {
      deposit_date: depositDate.toISOString().split('T')[0],
      bank_account_id: bankAccount,
      project_id: projectId || undefined,
      amount: depositAmount,
      memo: receivedFrom,
      company_name: companyName,
      company_address: companyAddress,
      company_city_state: companyCityState,
      bank_name: bankName,
      routing_number: routingNumber,
      account_number: accountNumber
    };

    try {
      await createDeposit.mutateAsync({ depositData, depositLines });
      
      if (saveAndNew) {
        // Reset form for new deposit
        setReceivedFrom("");
        setDepositRows([
          { id: Date.now().toString(), account: "", accountId: "", project: "", projectId: projectId || "", amount: "", memo: "" }
        ]);
      } else {
        // Navigate back
        navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
    }
  };

  // Get revenue/income accounts for dropdown
  const revenueAccounts = (accounts as any[]).filter(acc => 
    acc.type === 'revenue' || acc.type === 'income'
  );

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
                <div className="border-b pb-6 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{companyName}</h2>
                      <p className="text-sm text-muted-foreground">{companyAddress}</p>
                      <p className="text-sm text-muted-foreground">{companyCityState}</p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-3xl font-bold">DEPOSIT</h1>
                      <p className="text-sm text-muted-foreground mt-2">
                        Date: {format(depositDate, "MM/dd/yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deposit Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="depositDate">Deposit Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !depositDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {depositDate ? format(depositDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={depositDate}
                          onSelect={(date) => date && setDepositDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receivedFrom">Received From</Label>
                    <Input
                      id="receivedFrom"
                      value={receivedFrom}
                      onChange={(e) => setReceivedFrom(e.target.value)}
                      placeholder="Customer or source name"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bankAccount">Deposit To (Bank Account)</Label>
                    <AccountSearchInputInline
                      value={bankAccount}
                      onChange={setBankAccount}
                      accountType="asset"
                      placeholder="Select bank account"
                    />
                  </div>
                </div>

                {/* Deposit Lines */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Deposit Details</h3>
                    <Button onClick={addDepositRow} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Line
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">Account</th>
                          <th className="text-left p-3 font-medium">Project</th>
                          <th className="text-right p-3 font-medium">Amount</th>
                          <th className="text-left p-3 font-medium">Memo</th>
                          <th className="w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {depositRows.map((row) => (
                          <tr key={row.id} className="border-t">
                            <td className="p-2">
                              <AccountSearchInputInline
                                value={row.accountId || ""}
                                onChange={(value) => updateDepositRow(row.id, 'accountId', value)}
                                accountType="revenue"
                                placeholder="Select revenue account"
                              />
                            </td>
                            <td className="p-2">
                              <JobSearchInput
                                value={row.projectId || ""}
                                onChange={(projectId) => {
                                  updateDepositRow(row.id, 'projectId', projectId);
                                }}
                                placeholder="Optional"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.amount}
                                onChange={(e) => updateDepositRow(row.id, 'amount', e.target.value)}
                                placeholder="0.00"
                                className="text-right"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateDepositRow(row.id, 'memo', e.target.value)}
                                placeholder="Optional note"
                              />
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDepositRow(row.id)}
                                disabled={depositRows.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total Amount Display */}
                <div className="border-t pt-6">
                  <div className="flex justify-end mb-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Total Deposit Amount:</p>
                      <p className="text-3xl font-bold">${getDisplayAmount()}</p>
                      <p className="text-xs text-muted-foreground mt-2 max-w-md">
                        {numberToWords(parseFloat(calculateTotal()))}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => navigate(projectId ? `/project/${projectId}/accounting` : '/accounting')}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleSave(true)}
                    >
                      Save and New
                    </Button>
                    <Button onClick={() => handleSave(false)}>
                      Save and Close
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
