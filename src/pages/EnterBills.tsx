import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useBills, BillData, BillLineData } from "@/hooks/useBills";
import { useAccounts } from "@/hooks/useAccounts";
import { toast } from "@/hooks/use-toast";
import { BillAttachmentUpload, BillAttachment as BillPDFAttachment } from "@/components/BillAttachmentUpload";

interface ExpenseRow {
  id: string;
  account: string;
  quantity: string;
  amount: string;
  memo: string;
}

export default function EnterBills() {
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [billDueDate, setBillDueDate] = useState<Date>();
  const [vendor, setVendor] = useState<string>("");
  const [terms, setTerms] = useState<string>("net-30");
  const [job, setJob] = useState<string>("");
  const [jobCostRows, setJobCostRows] = useState<ExpenseRow[]>([
    { id: "1", account: "", quantity: "", amount: "", memo: "" }
  ]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
    { id: "1", account: "", quantity: "", amount: "", memo: "" }
  ]);
  const [savedBillId, setSavedBillId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<BillPDFAttachment[]>([]);

  const { createBill, postBill } = useBills();
  const { accountingSettings } = useAccounts();

  // Calculate due date when bill date or terms change
  useEffect(() => {
    if (billDate && terms) {
      let daysToAdd = 0;
      switch (terms) {
        case "net-15":
          daysToAdd = 15;
          break;
        case "net-30":
          daysToAdd = 30;
          break;
        case "net-60":
          daysToAdd = 60;
          break;
        case "due-on-receipt":
          daysToAdd = 0;
          break;
        default:
          daysToAdd = 30;
      }
      setBillDueDate(addDays(billDate, daysToAdd));
    }
  }, [billDate, terms]);

  // Set initial due date
  useEffect(() => {
    const today = new Date();
    setBillDueDate(addDays(today, 30)); // Default to Net 30
  }, []);

  const addJobCostRow = () => {
    const newRow: ExpenseRow = {
      id: Date.now().toString(),
      account: "",
      quantity: "",
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

  const updateJobCostRow = (id: string, field: keyof ExpenseRow, value: string) => {
    setJobCostRows(jobCostRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Expense handlers
  const addExpenseRow = () => {
    const newRow: ExpenseRow = {
      id: Date.now().toString(),
      account: "",
      quantity: "",
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

  const updateExpenseRow = (id: string, field: keyof ExpenseRow, value: string) => {
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
    if (!vendor) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    const billData: BillData = {
      vendor_id: vendor,
      project_id: job || undefined,
      bill_date: billDate.toISOString().split('T')[0],
      due_date: billDueDate?.toISOString().split('T')[0],
      terms,
      reference_number: (document.getElementById('refNo') as HTMLInputElement)?.value || undefined,
      notes: undefined
    };

    const billLines: BillLineData[] = [
      ...jobCostRows
        .filter(row => row.account || row.amount)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.account || undefined,
          project_id: job || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) / (parseFloat(row.quantity) || 1) || 0,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || undefined
        })),
      ...expenseRows
        .filter(row => row.account || row.amount)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.account || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) / (parseFloat(row.quantity) || 1) || 0,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || undefined
        }))
    ];

    if (billLines.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      return;
    }

    try {
      const bill = await createBill.mutateAsync({ billData, billLines });
      setSavedBillId(bill.id);
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handlePost = async () => {
    if (!savedBillId) {
      await handleSaveAndClose();
      return;
    }

    if (!accountingSettings?.ap_account_id) {
      toast({
        title: "Setup Required",
        description: "Please configure Accounts Payable account in Accounting Settings",
        variant: "destructive",
      });
      return;
    }

    try {
      await postBill.mutateAsync(savedBillId);
    } catch (error) {
      console.error('Error posting bill:', error);
    }
  };

  const handleClear = () => {
    setBillDate(new Date());
    setBillDueDate(undefined);
    setVendor("");
    setTerms("net-30");
    setJob("");
    setJobCostRows([{ id: "1", account: "", quantity: "", amount: "", memo: "" }]);
    setExpenseRows([{ id: "1", account: "", quantity: "", amount: "", memo: "" }]);
    setSavedBillId(null);
    setAttachments([]);
    
    // Clear reference number field
    const refNoInput = document.getElementById('refNo') as HTMLInputElement;
    if (refNoInput) refNoInput.value = '';
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <CompanyDashboardHeader title="Bills - Enter Bills" />
          <div className="flex-1 p-6 space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                {/* Bill Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <VendorSearchInput
                      value={vendor}
                      onChange={setVendor}
                      placeholder="Search vendors..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !billDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {billDate ? format(billDate, "MM/dd/yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={billDate}
                          onSelect={setBillDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refNo">Reference No.</Label>
                    <Input id="refNo" placeholder="Enter reference number" />
                    
                    {/* Terms and Attachments split 50/50 below Reference Number */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="terms">Terms</Label>
                        <Select value={terms} onValueChange={setTerms}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="net-15">Net 15</SelectItem>
                            <SelectItem value="net-30">Net 30</SelectItem>
                            <SelectItem value="net-60">Net 60</SelectItem>
                            <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <BillAttachmentUpload 
                          attachments={attachments}
                          onAttachmentsChange={setAttachments}
                          billId={savedBillId || undefined}
                          disabled={createBill.isPending || postBill.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job">Job</Label>
                    <JobSearchInput
                      value={job}
                      onChange={setJob}
                      placeholder="Search jobs..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bill Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !billDueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {billDueDate ? format(billDueDate, "MM/dd/yyyy") : "Select due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={billDueDate}
                          onSelect={setBillDueDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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
                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-3">Cost Code</div>
                          <div className="col-span-4">Memo</div>
                          <div className="col-span-2">Quantity</div>
                          <div className="col-span-2">Cost</div>
                          <div className="col-span-1">Action</div>
                        </div>

                        {jobCostRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                            <div className="col-span-3">
                              <CostCodeSearchInput 
                                value={row.account}
                                onChange={(value) => updateJobCostRow(row.id, 'account', value)}
                                placeholder="Cost Code"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input 
                                placeholder="Job cost memo"
                                value={row.memo}
                                onChange={(e) => updateJobCostRow(row.id, 'memo', e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input 
                                type="number"
                                step="0.01"
                                placeholder="1"
                                value={row.quantity}
                                onChange={(e) => updateJobCostRow(row.id, 'quantity', e.target.value)}
                                className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={row.amount}
                                  onChange={(e) => updateJobCostRow(row.id, 'amount', e.target.value)}
                                  className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex justify-center">
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
                            <div className="col-span-3 font-medium">Total:</div>
                            <div className="col-span-2 font-medium">
                              ${jobCostRows.reduce((total, row) => {
                                const amount = parseFloat(row.amount) || 0;
                                return total + amount;
                              }, 0).toFixed(2)}
                            </div>
                            <div className="col-span-7"></div>
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

                      <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                          <div className="col-span-3">Account</div>
                          <div className="col-span-4">Memo</div>
                          <div className="col-span-2">Quantity</div>
                          <div className="col-span-2">Cost</div>
                          <div className="col-span-1">Action</div>
                        </div>

                        {expenseRows.map((row, index) => (
                          <div key={row.id} className="grid grid-cols-12 gap-2 p-3 border-t">
                            <div className="col-span-3">
                              <AccountSearchInput
                                value={row.account}
                                onChange={(value) => updateExpenseRow(row.id, 'account', value)}
                                placeholder="Select account"
                                accountType="expense"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-4">
                              <Input 
                                placeholder="Expense memo"
                                value={row.memo}
                                onChange={(e) => updateExpenseRow(row.id, 'memo', e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <Input 
                                type="number"
                                step="0.01"
                                placeholder="1"
                                value={row.quantity}
                                onChange={(e) => updateExpenseRow(row.id, 'quantity', e.target.value)}
                                className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            <div className="col-span-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input 
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={row.amount}
                                  onChange={(e) => updateExpenseRow(row.id, 'amount', e.target.value)}
                                  className="h-8 pl-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </div>
                            <div className="col-span-1 flex justify-center">
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

                        <div className="p-3 bg-muted border-t">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-3 font-medium">Total:</div>
                            <div className="col-span-2 font-medium">
                              ${expenseRows.reduce((total, row) => {
                                const amount = parseFloat(row.amount) || 0;
                                return total + amount;
                              }, 0).toFixed(2)}
                            </div>
                            <div className="col-span-7"></div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    className="flex-1"
                    onClick={handleSaveAndClose}
                    disabled={createBill.isPending}
                  >
                    {createBill.isPending ? "Saving..." : "Save & Close"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={handlePost}
                    disabled={postBill.isPending || (!savedBillId && createBill.isPending)}
                  >
                    {postBill.isPending ? "Posting..." : "Save & Post"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleClear}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
