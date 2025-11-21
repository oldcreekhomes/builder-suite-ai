import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { useBills, BillData, BillLineData } from "@/hooks/useBills";
import { toast } from "@/hooks/use-toast";
import { BillAttachmentUpload, BillAttachment as BillPDFAttachment } from "@/components/BillAttachmentUpload";
import { supabase } from "@/integrations/supabase/client";

// Normalize terms from any format to standardized dropdown values
function normalizeTermsForUI(terms: string | null | undefined): string {
  if (!terms) return 'net-30';
  
  // Already in correct format
  if (['net-15', 'net-30', 'net-60', 'due-on-receipt'].includes(terms)) {
    return terms;
  }
  
  // Try to normalize
  const normalized = terms.toLowerCase().trim();
  if (normalized.includes('15')) return 'net-15';
  if (normalized.includes('60')) return 'net-60';
  if (normalized.includes('receipt') || normalized.includes('cod')) return 'due-on-receipt';
  
  // Default to net-30
  return 'net-30';
}

interface ExpenseRow {
  id: string;
  account: string;
  accountId?: string;
  project: string;
  projectId?: string;
  quantity: string;
  amount: string;
  memo: string;
}

export function ManualBillEntry() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [billDueDate, setBillDueDate] = useState<Date>();
  const [vendor, setVendor] = useState<string>("");
  const [terms, setTerms] = useState<string>("net-30");
  const [jobCostRows, setJobCostRows] = useState<ExpenseRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "", amount: "", memo: "" }
  ]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([
    { id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "", amount: "", memo: "" }
  ]);
  const [savedBillId, setSavedBillId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<BillPDFAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createBill } = useBills();

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
    setBillDueDate(addDays(today, 30));
  }, []);

  // Auto-populate terms when vendor is selected
  useEffect(() => {
    const fetchVendorTerms = async () => {
      if (!vendor) return;
      
      const { data: company } = await supabase
        .from('companies')
        .select('terms')
        .eq('id', vendor)
        .single();
      
      if (company?.terms) {
        setTerms(normalizeTermsForUI(company.terms));
      }
    };
    
    fetchVendorTerms();
  }, [vendor]);

  const addJobCostRow = () => {
    const newRow: ExpenseRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
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

  const addExpenseRow = () => {
    const newRow: ExpenseRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: projectId || "",
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

  const resolveCostCodeIdFromText = (
    text: string, 
    costCodes: Array<{ id: string; code: string; name: string }>
  ): string => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    
    const code = trimmed.includes(" - ") 
      ? trimmed.split(" - ")[0].trim()
      : trimmed.includes(" ") 
      ? trimmed.split(" ")[0].trim()
      : trimmed;
    
    const normalized = trimmed.toLowerCase();
    
    const exactMatch = costCodes.find(cc => cc.code === code);
    if (exactMatch) return exactMatch.id;
    
    const caseInsensitiveMatch = costCodes.find(
      cc => cc.code.toLowerCase() === code.toLowerCase()
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch.id;
    
    const fullMatch = costCodes.find(
      cc => `${cc.code} - ${cc.name}`.toLowerCase() === normalized ||
            `${cc.code} ${cc.name}`.toLowerCase() === normalized
    );
    if (fullMatch) return fullMatch.id;
    
    return "";
  };

  const handleSave = async (saveAndNew: boolean) => {
    if (isSubmitting) {
      console.log('Already submitting, ignoring duplicate request');
      return;
    }

    if (!vendor) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!projectId) {
      toast({
        title: "Validation Error",
        description: "Bills must be associated with a project. Please navigate to a specific project to enter bills.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    const { data: allCostCodes } = await supabase
      .from('cost_codes')
      .select('id, code, name');

    const resolvedJobRows = jobCostRows.map(row => {
      if ((parseFloat(row.amount) || 0) > 0 && !row.accountId && row.account?.trim() && allCostCodes) {
        const id = resolveCostCodeIdFromText(row.account, allCostCodes);
        return id ? { ...row, accountId: id } : row;
      }
      return row;
    });

    setJobCostRows(resolvedJobRows);

    const invalidJobCostRows = resolvedJobRows.filter(row => 
      parseFloat(row.amount) > 0 && !row.accountId
    );
    
    if (invalidJobCostRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "All job cost items must have a cost code selected. Please select a cost code from the dropdown.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Auto-resolve account IDs for expense rows (similar to cost code resolution)
    const { data: allAccounts } = await supabase
      .from('accounts')
      .select('id, code, name');

    const resolvedExpenseRows = expenseRows.map(row => {
      if ((parseFloat(row.amount) || 0) > 0 && !row.accountId && row.account?.trim() && allAccounts) {
        const trimmed = row.account.trim();
        const code = trimmed.includes(" - ") 
          ? trimmed.split(" - ")[0].trim()
          : trimmed.includes(" ") 
          ? trimmed.split(" ")[0].trim()
          : trimmed;
        
        const normalized = trimmed.toLowerCase();
        
        // Try exact match by code
        const exactMatch = allAccounts.find(acc => acc.code === code);
        if (exactMatch) return { ...row, accountId: exactMatch.id };
        
        // Try case-insensitive code match
        const caseInsensitiveMatch = allAccounts.find(
          acc => acc.code.toLowerCase() === code.toLowerCase()
        );
        if (caseInsensitiveMatch) return { ...row, accountId: caseInsensitiveMatch.id };
        
        // Try full text match
        const fullMatch = allAccounts.find(
          acc => `${acc.code} - ${acc.name}`.toLowerCase() === normalized ||
                 `${acc.code} ${acc.name}`.toLowerCase() === normalized
        );
        if (fullMatch) return { ...row, accountId: fullMatch.id };
      }
      return row;
    });

    setExpenseRows(resolvedExpenseRows);

    const invalidExpenseRows = resolvedExpenseRows.filter(row => 
      parseFloat(row.amount) > 0 && !row.accountId
    );
    
    if (invalidExpenseRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "All expense items must have an account selected. Please select an account from the dropdown.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const billLines: BillLineData[] = [
      ...resolvedJobRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.accountId || undefined,
          project_id: row.projectId || projectId || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) || 0,
          amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.amount) || 0),
          memo: row.memo || undefined
        })),
      ...resolvedExpenseRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId || undefined,
          project_id: row.projectId || projectId || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) || 0,
          amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.amount) || 0),
          memo: row.memo || undefined
        }))
    ];

    if (billLines.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one line item",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    let derivedProjectId = projectId;
    if (!projectId) {
      const lineProjectIds = billLines.map(line => line.project_id).filter(Boolean);
      if (lineProjectIds.length > 0 && lineProjectIds.every(id => id === lineProjectIds[0])) {
        derivedProjectId = lineProjectIds[0];
      }
    }

    if (!derivedProjectId) {
      toast({
        title: "Validation Error",
        description: "Bills must be associated with a project.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const billData: BillData = {
      vendor_id: vendor,
      project_id: derivedProjectId,
      bill_date: billDate.toISOString().split('T')[0],
      due_date: billDueDate?.toISOString().split('T')[0],
      terms,
      reference_number: (document.getElementById('refNo') as HTMLInputElement)?.value || undefined,
      notes: undefined
    };

    try {
      const bill = await createBill.mutateAsync({ billData, billLines });
      setSavedBillId(bill.id);

      if (vendor && terms) {
        await supabase
          .from('companies')
          .update({ terms })
          .eq('id', vendor);
      }

      if (attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.id) continue;

          try {
            const timestamp = Date.now();
            const sanitizedName = attachment.file_name
              .replace(/\s+/g, '_')
              .replace(/[^\w.-]/g, '_')
              .replace(/_+/g, '_');
            const fileName = `${timestamp}_${sanitizedName}`;
            const filePath = `${bill.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('bill-attachments')
              .upload(filePath, attachment.file!);

            if (uploadError) {
              console.error('Upload error:', uploadError);
              continue;
            }

            await supabase
              .from('bill_attachments')
              .insert({
                bill_id: bill.id,
                file_name: attachment.file_name,
                file_path: filePath,
                file_size: attachment.file_size,
                content_type: attachment.content_type,
                uploaded_by: (await supabase.auth.getUser()).data.user?.id
              });
          } catch (error) {
            console.error('Error uploading attachment:', error);
          }
        }
      }

      toast({
        title: "Bill Saved",
        description: "Bill has been saved as draft",
      });
      
      if (saveAndNew) {
        handleClear();
      } else {
        navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      toast({
        title: "Error",
        description: "Failed to save bill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setBillDate(new Date());
    setBillDueDate(undefined);
    setVendor("");
    setTerms("net-30");
    setJobCostRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "", amount: "", memo: "" }]);
    setExpenseRows([{ id: "1", account: "", accountId: "", project: "", projectId: projectId || "", quantity: "", amount: "", memo: "" }]);
    setSavedBillId(null);
    setAttachments([]);
    setIsSubmitting(false);
    
    const refNoInput = document.getElementById('refNo') as HTMLInputElement;
    if (refNoInput) refNoInput.value = '';
  };

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <VendorSearchInput
              value={vendor}
              onChange={setVendor}
              placeholder="Search vendors..."
              className="w-full h-10"
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refNo">Reference No.</Label>
            <Input id="refNo" placeholder="Enter reference number" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

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
                <SelectItem value="due-on-receipt">On Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <BillAttachmentUpload 
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              billId={savedBillId || undefined}
              disabled={isSubmitting}
            />
          </div>
        </div>

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
                  <div className="col-span-4">Memo</div>
                  <div className="col-span-1">Quantity</div>
                  <div className="col-span-1">Cost</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {jobCostRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-10 gap-2 p-3 border-t">
                    <div className="col-span-2">
                      <CostCodeSearchInput 
                        value={row.account}
                        onChange={(value) => updateJobCostRow(row.id, 'account', value)}
                        onCostCodeSelect={(costCode) => {
                          updateJobCostRow(row.id, 'accountId', costCode.id);
                          updateJobCostRow(row.id, 'account', `${costCode.code} - ${costCode.name}`);
                        }}
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
                    <div className="col-span-1">
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateJobCostRow(row.id, 'quantity', e.target.value)}
                        className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-1">
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
                    <div className="col-span-1 flex items-center">
                      <span className="text-sm font-medium">
                        ${((parseFloat(row.quantity) || 0) * (parseFloat(row.amount) || 0)).toFixed(2)}
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
                  <div className="grid grid-cols-10 gap-2">
                    <div className="col-span-6 font-medium">
                      {jobCostRows.reduce((total, row) => {
                        const q = parseFloat(row.quantity) || 0;
                        const c = parseFloat(row.amount) || 0;
                        return total + q * c;
                      }, 0) < 0 ? 'Bill Credit Total:' : 'Job Cost Total:'}
                    </div>
                    <div className={cn(
                      "col-span-1 font-medium",
                      jobCostRows.reduce((total, row) => {
                        const q = parseFloat(row.quantity) || 0;
                        const c = parseFloat(row.amount) || 0;
                        return total + q * c;
                      }, 0) < 0 && "text-green-600"
                    )}>
                      ${jobCostRows.reduce((total, row) => {
                        const q = parseFloat(row.quantity) || 0;
                        const c = parseFloat(row.amount) || 0;
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

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-10 gap-2 p-3 bg-muted font-medium text-sm">
                  <div className="col-span-2">Account</div>
                  <div className="col-span-4">Memo</div>
                  <div className="col-span-1">Quantity</div>
                  <div className="col-span-1">Cost</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {expenseRows.map((row) => (
                  <div key={row.id} className="grid grid-cols-10 gap-2 p-3 border-t">
                    <div className="col-span-2">
                          <AccountSearchInput
                            value={row.account || ""}
                            onChange={(value) => updateExpenseRow(row.id, 'account', value)}
                            onAccountSelect={(account) => {
                              updateExpenseRow(row.id, 'accountId', account.id);
                              updateExpenseRow(row.id, 'account', `${account.code} - ${account.name}`);
                            }}
                            placeholder="Select account"
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
                    <div className="col-span-1">
                      <Input 
                        type="number"
                        step="0.01"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateExpenseRow(row.id, 'quantity', e.target.value)}
                        className="h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="col-span-1">
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
                    <div className="col-span-1 flex items-center">
                      <span className="text-sm font-medium">
                        ${((parseFloat(row.quantity) || 0) * (parseFloat(row.amount) || 0)).toFixed(2)}
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

                <div className="p-3 bg-muted border-t">
                  <div className="grid grid-cols-10 gap-2">
                    <div className="col-span-6 font-medium">
                      {expenseRows.reduce((total, row) => {
                        const q = parseFloat(row.quantity) || 0;
                        const c = parseFloat(row.amount) || 0;
                        return total + q * c;
                      }, 0) < 0 ? 'Bill Credit Total:' : 'Expense Total:'}
                    </div>
                    <div className={cn(
                      "col-span-1 font-medium",
                      expenseRows.reduce((total, row) => {
                        const q = parseFloat(row.quantity) || 0;
                        const c = parseFloat(row.amount) || 0;
                        return total + q * c;
                      }, 0) < 0 && "text-green-600"
                    )}>
                      ${expenseRows.reduce((total, row) => {
                        const q = parseFloat(row.quantity) || 0;
                        const c = parseFloat(row.amount) || 0;
                        return total + q * c;
                      }, 0).toFixed(2)}
                    </div>
                    <div className="col-span-3"></div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            type="button" 
            className="flex-1"
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save & Close"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save & New"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
