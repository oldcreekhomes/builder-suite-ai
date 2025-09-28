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
import { toast } from "@/hooks/use-toast";

interface CheckRow {
  id: string;
  account: string;
  accountId?: string; // For storing cost code/account UUID
  project: string;
  projectId?: string; // For storing project UUID
  amount: string;
  memo: string;
}

export default function WriteChecks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [checkDate, setCheckDate] = useState<Date>(new Date());
  const [payTo, setPayTo] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [jobCostRows, setJobCostRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", amount: "", memo: "" }
  ]);
  const [expenseRows, setExpenseRows] = useState<CheckRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", amount: "", memo: "" }
  ]);

  const { data: project } = useProject(projectId || "");
  const { accounts } = useAccounts();
  const { projects } = useProjectSearch();

  const addJobCostRow = () => {
    const newRow: CheckRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
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
      const amount = parseFloat(row.amount) || 0;
      return total + amount;
    }, 0);
    
    const expenseTotal = expenseRows.reduce((total, row) => {
      const amount = parseFloat(row.amount) || 0;
      return total + amount;
    }, 0);
    
    return (jobCostTotal + expenseTotal).toFixed(2);
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

    const allRows = [...jobCostRows, ...expenseRows].filter(row => row.accountId || row.amount);
    
    if (allRows.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement check creation logic
    toast({
      title: "Check Saved",
      description: "Check has been saved successfully",
    });
    
    navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
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

    const allRows = [...jobCostRows, ...expenseRows].filter(row => row.accountId || row.amount);
    
    if (allRows.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement check creation logic
    toast({
      title: "Check Saved",
      description: "Check has been saved successfully",
    });
    
    handleClear();
  };

  const handleClear = () => {
    setCheckDate(new Date());
    setPayTo("");
    setCheckNumber("");
    setBankAccount("");
    setJobCostRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", amount: "", memo: "" }]);
    setExpenseRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", amount: "", memo: "" }]);
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
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-gray-600">Your Company Name</div>
                      <div className="text-xs text-gray-500">123 Business Street</div>
                      <div className="text-xs text-gray-500">City, State 12345</div>
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-600">DATE</Label>
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
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-600">CHECK #</Label>
                        <Input 
                          value={checkNumber}
                          onChange={(e) => setCheckNumber(e.target.value)}
                          placeholder="001"
                          className="w-20 text-center border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pay to line */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">PAY TO THE ORDER OF</span>
                      <div className="flex-1 border-b-2 border-gray-400">
                        <VendorSearchInput
                          value={payTo}
                          onChange={setPayTo}
                          placeholder="Enter payee name..."
                          className="border-0 bg-transparent h-8 text-lg font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount line */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center">
                      <span className="text-sm font-medium mr-2">$</span>
                      <div className="flex-1 border-b-2 border-gray-400 pr-4">
                        <span className="text-lg font-medium">{calculateTotal()}</span>
                        <span className="text-sm text-gray-500 ml-2">DOLLARS</span>
                      </div>
                    </div>
                    <div className="ml-4 border-2 border-gray-400 px-3 py-1 min-w-[120px] text-right">
                      <span className="text-sm text-gray-600">$</span>
                      <span className="text-xl font-bold ml-1">{calculateTotal()}</span>
                    </div>
                  </div>

                  {/* Bank account and memo line */}
                  <div className="flex items-end justify-between pt-4">
                    <div className="space-y-2 flex-1 max-w-xs">
                      <Label className="text-xs text-gray-600">BANK ACCOUNT</Label>
                      <AccountSearchInput
                        value={bankAccount}
                        onChange={setBankAccount}
                        placeholder="Select bank account..."
                        className="border-b-2 border-t-0 border-l-0 border-r-0 rounded-none bg-transparent"
                        accountType="asset"
                      />
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      <div>⚍123456789⚍ ⚊1234567890⚊ {checkNumber || "001"}</div>
                      <div className="mt-1">Your Bank • Routing: 123456789</div>
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

                      <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-10 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-2">Cost Code</div>
                          <div className="col-span-2">Project</div>
                          <div className="col-span-4">Memo</div>
                          <div className="col-span-1">Amount</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {jobCostRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-10 gap-2 p-3 border-t">
                            <div className="col-span-2">
                              <CostCodeSearchInput
                                value={row.account}
                                onChange={(value) => updateJobCostRow(row.id, "account", value)}
                                onCostCodeSelect={(costCode) => updateJobCostRow(row.id, "accountId", costCode.id)}
                                placeholder="Select cost code..."
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
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateJobCostRow(row.id, "memo", e.target.value)}
                                placeholder="Enter memo..."
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.amount}
                                onChange={(e) => updateJobCostRow(row.id, "amount", e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeJobCostRow(row.id)}
                                disabled={jobCostRows.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="expense" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Button onClick={addExpenseRow} size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Row
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-10 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-2">Account</div>
                          <div className="col-span-2">Project</div>
                          <div className="col-span-4">Memo</div>
                          <div className="col-span-1">Amount</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {expenseRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-10 gap-2 p-3 border-t">
                            <div className="col-span-2">
                              <AccountSearchInput
                                value={row.accountId || ""}
                                onChange={(accountId) => {
                                  updateExpenseRow(row.id, "accountId", accountId);
                                  // Find account name for display
                                  const account = accounts?.find(a => a.id === accountId);
                                  updateExpenseRow(row.id, "account", account ? `${account.code} - ${account.name}` : "");
                                }}
                                placeholder="Select account..."
                                accountType="expense"
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
                                placeholder="Select project..."
                              />
                            </div>
                            <div className="col-span-4">
                              <Input
                                value={row.memo}
                                onChange={(e) => updateExpenseRow(row.id, "memo", e.target.value)}
                                placeholder="Enter memo..."
                              />
                            </div>
                            <div className="col-span-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={row.amount}
                                onChange={(e) => updateExpenseRow(row.id, "amount", e.target.value)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExpenseRow(row.id)}
                                disabled={expenseRows.length === 1}
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
                    Total: ${calculateTotal()}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClear}>
                      Clear
                    </Button>
                    <Button variant="outline" onClick={handleSaveAndNew}>
                      Save & New
                    </Button>
                    <Button onClick={handleSaveAndClose}>
                      Save & Close
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