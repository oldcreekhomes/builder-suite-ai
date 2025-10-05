import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
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
import { useProject } from "@/hooks/useProject";
import { toast } from "@/hooks/use-toast";
import { BillAttachmentUpload, BillAttachment as BillPDFAttachment } from "@/components/BillAttachmentUpload";
import SimplifiedAIBillExtraction from "@/components/bills/SimplifiedAIBillExtraction";
import { BatchBillReviewTable } from "@/components/bills/BatchBillReviewTable";
import { usePendingBills } from "@/hooks/usePendingBills";
import { supabase } from "@/integrations/supabase/client";

interface ExpenseRow {
  id: string;
  account: string;
  accountId?: string; // For storing cost code/account UUID
  project: string;
  projectId?: string; // For storing project UUID
  quantity: string;
  amount: string;
  memo: string;
}

export default function EnterBills() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("manual");
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
  
  const { pendingBills, isLoading: loadingPendingBills, batchApproveBills } = usePendingBills();
  const [batchBills, setBatchBills] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createBill } = useBills();
  const { accountingSettings } = useAccounts();
  const { data: project } = useProject(projectId || "");

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

  // Expense handlers
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

  // Update batch bills when pending bills change - fetch lines for each bill
  useEffect(() => {
    const fetchBillsWithLines = async () => {
      if (!pendingBills || pendingBills.length === 0) {
        setBatchBills([]);
        return;
      }

      const completedBills = pendingBills.filter(b => 
        b.status === 'extracted' || b.status === 'completed' || b.status === 'reviewing'
      );
      
      const billsWithLines = await Promise.all(
        completedBills.map(async (bill) => {
          const extractedData = bill.extracted_data || {};
          
          // Fetch line items for this bill
          const { data: lines } = await supabase
            .from('pending_bill_lines')
            .select('*')
            .eq('pending_upload_id', bill.id)
            .order('line_number');
          
          // Normalize date format
          const normalizeDateToYYYYMMDD = (dateStr: string) => {
            if (!dateStr) return '';
            try {
              const date = new Date(dateStr);
              return date.toISOString().split('T')[0];
            } catch {
              return dateStr;
            }
          };

          // If no lines exist but extractedData has lineItems, auto-populate
          let finalLines = lines || [];
          if ((!lines || lines.length === 0) && extractedData.lineItems && Array.isArray(extractedData.lineItems) && extractedData.lineItems.length > 0) {
            const { data: userData } = await supabase.auth.getUser();
            const ownerId = userData.user?.id;

            const linesToInsert = extractedData.lineItems.map((item: any, index: number) => ({
              pending_upload_id: bill.id,
              owner_id: ownerId,
              line_number: index + 1,
              line_type: 'expense',
              description: item.description || '',
              quantity: item.quantity || 1,
              unit_cost: item.unitPrice || item.unit_cost || 0,
              amount: item.amount || ((item.quantity || 1) * (item.unitPrice || item.unit_cost || 0)),
              memo: item.memo || item.description || '',
            }));

            const { data: insertedLines } = await supabase
              .from('pending_bill_lines')
              .insert(linesToInsert)
              .select();

            finalLines = insertedLines || [];
          }
          
          return {
            id: bill.id,
            file_name: bill.file_name,
            file_path: bill.file_path,
            status: bill.status,
            vendor_id: extractedData.vendorId || null,
            vendor_name: extractedData.vendor || '',
            bill_date: normalizeDateToYYYYMMDD(extractedData.billDate || extractedData.date || '') || new Date().toISOString().split('T')[0],
            due_date: normalizeDateToYYYYMMDD(extractedData.dueDate || ''),
            reference_number: extractedData.referenceNumber || '',
            terms: extractedData.terms || 'net-30',
            notes: extractedData.notes || '',
            lines: finalLines
          };
        })
      );
      
      setBatchBills(billsWithLines);
    };

    fetchBillsWithLines();
  }, [pendingBills]);

  const handleBillUpdate = (billId: string, updates: any) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, ...updates } : bill
    ));
  };

  const handleBillDelete = async (billId: string) => {
    const { error } = await supabase
      .from('pending_bill_uploads')
      .delete()
      .eq('id', billId);
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete bill",
        variant: "destructive",
      });
      return;
    }
    
    setBatchBills(prev => prev.filter(bill => bill.id !== billId));
    toast({
      title: "Success",
      description: "Bill deleted successfully",
    });
  };

  const handleLinesUpdate = async (billId: string, lines: any[]) => {
    setBatchBills(prev => prev.map(bill => 
      bill.id === billId ? { ...bill, lines } : bill
    ));

    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;

    await supabase
      .from('pending_bill_lines')
      .delete()
      .eq('pending_upload_id', billId);

    const linesToInsert = lines.map(line => ({
      pending_upload_id: billId,
      owner_id: ownerId,
      ...line,
    }));

    await supabase
      .from('pending_bill_lines')
      .insert(linesToInsert);
  };

  const handleSubmitAllBills = async () => {
    setIsSubmitting(true);
    
    const billsToSubmit = batchBills
      .filter(bill => bill.vendor_name && bill.bill_date)
      .map(bill => ({
        pendingUploadId: bill.id,
        vendorId: bill.vendor_name, // For now using name, need to lookup ID
        billDate: bill.bill_date,
        dueDate: bill.due_date,
        referenceNumber: bill.reference_number,
        terms: bill.terms,
      }));

    if (billsToSubmit.length === 0) {
      toast({
        title: "Validation Error",
        description: "No bills are ready to submit. Please ensure vendor and bill date are filled.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const results = await batchApproveBills.mutateAsync(billsToSubmit);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        toast({
          title: "Success",
          description: `${successful} bill${successful > 1 ? 's' : ''} created successfully${failed > 0 ? `, ${failed} failed` : ''}`,
        });
      }

      if (failed === 0) {
        setBatchBills([]);
        navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit bills",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIDataExtracted = (extractedData: any) => {
    // Populate form with AI-extracted data
    if (extractedData.vendor_name) {
      setVendor(extractedData.vendor_name);
    }
    
    if (extractedData.bill_date) {
      setBillDate(new Date(extractedData.bill_date));
    }
    
    if (extractedData.due_date) {
      setBillDueDate(new Date(extractedData.due_date));
    }
    
    if (extractedData.terms) {
      // Map extracted terms to our term options
      const termsLower = extractedData.terms.toLowerCase();
      if (termsLower.includes('15')) setTerms('net-15');
      else if (termsLower.includes('30')) setTerms('net-30');
      else if (termsLower.includes('60')) setTerms('net-60');
      else if (termsLower.includes('receipt')) setTerms('due-on-receipt');
    }

    // Populate job cost rows from line items
    if (extractedData.line_items && Array.isArray(extractedData.line_items) && extractedData.line_items.length > 0) {
      const newJobCostRows: ExpenseRow[] = extractedData.line_items.map((item: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        account: item.description || "",
        accountId: "",
        project: "",
        projectId: projectId || "",
        quantity: item.quantity?.toString() || "1",
        amount: item.amount?.toString() || "0",
        memo: item.memo || item.description || ""
      }));
      setJobCostRows(newJobCostRows);
    }
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

    const billLines: BillLineData[] = [
      ...jobCostRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.accountId || undefined,
          project_id: row.projectId || projectId || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) / (parseFloat(row.quantity) || 1) || 0,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || undefined
        })),
      ...expenseRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId || undefined,
          project_id: row.projectId || projectId || undefined,
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

    // Derive project_id from line items if bill has no project but all line items share same project
    let derivedProjectId = projectId;
    if (!projectId) {
      const lineProjectIds = billLines.map(line => line.project_id).filter(Boolean);
      if (lineProjectIds.length > 0 && lineProjectIds.every(id => id === lineProjectIds[0])) {
        derivedProjectId = lineProjectIds[0];
      }
    }

    const billData: BillData = {
      vendor_id: vendor,
      project_id: derivedProjectId || undefined,
      bill_date: billDate.toISOString().split('T')[0],
      due_date: billDueDate?.toISOString().split('T')[0],
      terms,
      reference_number: (document.getElementById('refNo') as HTMLInputElement)?.value || undefined,
      notes: undefined
    };

    try {
      const bill = await createBill.mutateAsync({ billData, billLines });
      setSavedBillId(bill.id);
      toast({
        title: "Bill Saved",
        description: "Bill has been saved as draft",
      });
      navigate(projectId ? `/project/${projectId}/accounting` : '/accounting');
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleSaveAndNew = async () => {
    if (!vendor) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    const billLines: BillLineData[] = [
      ...jobCostRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.accountId || undefined,
          project_id: row.projectId || projectId || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) / (parseFloat(row.quantity) || 1) || 0,
          amount: parseFloat(row.amount) || 0,
          memo: row.memo || undefined
        })),
      ...expenseRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId || undefined,
          project_id: row.projectId || projectId || undefined,
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

    // Derive project_id from line items if bill has no project but all line items share same project
    let derivedProjectId = projectId;
    if (!projectId) {
      const lineProjectIds = billLines.map(line => line.project_id).filter(Boolean);
      if (lineProjectIds.length > 0 && lineProjectIds.every(id => id === lineProjectIds[0])) {
        derivedProjectId = lineProjectIds[0];
      }
    }

    const billData: BillData = {
      vendor_id: vendor,
      project_id: derivedProjectId || undefined,
      bill_date: billDate.toISOString().split('T')[0],
      due_date: billDueDate?.toISOString().split('T')[0],
      terms,
      reference_number: (document.getElementById('refNo') as HTMLInputElement)?.value || undefined,
      notes: undefined
    };

    try {
      await createBill.mutateAsync({ billData, billLines });
      toast({
        title: "Bill Saved",
        description: "Bill has been saved as draft",
      });
      handleClear();
    } catch (error) {
      console.error('Error saving bill:', error);
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
    
    // Clear reference number field
    const refNoInput = document.getElementById('refNo') as HTMLInputElement;
    if (refNoInput) refNoInput.value = '';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Enter Bills" 
            projectId={projectId}
          />
          
          <div className="flex-1 p-6 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manually Enter Bills</TabsTrigger>
                <TabsTrigger value="ai">Enter Bills with AI</TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="mt-6 space-y-6">
                <SimplifiedAIBillExtraction 
                  onDataExtracted={() => {}}
                  onSwitchToManual={() => setActiveTab("manual")}
                />

                {batchBills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle>Extracted Bills</CardTitle>
                          <CardDescription>
                            Review and edit {batchBills.length} bill{batchBills.length > 1 ? 's' : ''} before submitting
                          </CardDescription>
                        </div>
                        <Button
                          onClick={handleSubmitAllBills}
                          disabled={isSubmitting || batchBills.length === 0}
                          size="lg"
                        >
                          {isSubmitting ? "Submitting..." : `Submit All Bills (${batchBills.length})`}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <BatchBillReviewTable
                        bills={batchBills}
                        onBillUpdate={handleBillUpdate}
                        onBillDelete={handleBillDelete}
                        onLinesUpdate={handleLinesUpdate}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="manual" className="mt-6">
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
                      className="h-8"
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

                {/* Second row: Bill Due Date, Terms, Attachments - 3 columns */}
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
                        <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <BillAttachmentUpload 
                      attachments={attachments}
                      onAttachmentsChange={setAttachments}
                      billId={savedBillId || undefined}
                      disabled={createBill.isPending}
                    />
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
                                onChange={(value) => updateJobCostRow(row.id, 'account', value)}
                                onCostCodeSelect={(costCode) => {
                                  updateJobCostRow(row.id, 'accountId', costCode.id);
                                  updateJobCostRow(row.id, 'account', `${costCode.code} - ${costCode.name}`);
                                }}
                                placeholder="Cost Code"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <JobSearchInput 
                                value={row.projectId || ""}
                                onChange={(projectId) => {
                                  updateJobCostRow(row.id, 'projectId', projectId);
                                  // Update display text - this will be handled by the JobSearchInput component
                                }}
                                placeholder="Select project"
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
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8 font-medium">Total:</div>
                            <div className="col-span-1 font-medium">
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
                                onChange={(accountId) => updateExpenseRow(row.id, 'accountId', accountId)}
                                placeholder="Select account"
                                accountType="expense"
                                className="h-8"
                              />
                            </div>
                            <div className="col-span-2">
                              <JobSearchInput 
                                value={row.projectId || ""}
                                onChange={(projectId) => {
                                  updateExpenseRow(row.id, 'projectId', projectId);
                                  // Update display text - this will be handled by the JobSearchInput component
                                }}
                                placeholder="Select project"
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
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-8 font-medium">Total:</div>
                            <div className="col-span-1 font-medium">
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
                    onClick={handleSaveAndNew}
                    disabled={createBill.isPending}
                  >
                    {createBill.isPending ? "Saving..." : "Save & New"}
                  </Button>
                </div>
               </CardContent>
             </Card>
              </TabsContent>
            </Tabs>
           </div>
         </SidebarInset>
       </div>
     </SidebarProvider>
   );
 }
