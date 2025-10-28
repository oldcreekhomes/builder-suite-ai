import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { getFileIcon, getFileIconColor } from '@/components/bidding/utils/fileIconUtils';
import { cn } from "@/lib/utils";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { useBills, BillLineData } from "@/hooks/useBills";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';

interface EditBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
}

interface ExpenseRow {
  id: string;
  dbId?: string;
  account: string;
  accountId?: string;
  project: string;
  projectId?: string;
  quantity: string;
  amount: string;
  memo: string;
}

interface BillAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
}

function normalizeTermsForUI(terms: string | null | undefined): string {
  if (!terms) return 'net-30';
  if (['net-15', 'net-30', 'net-60', 'due-on-receipt'].includes(terms)) {
    return terms;
  }
  const normalized = terms.toLowerCase().trim();
  if (normalized.includes('15')) return 'net-15';
  if (normalized.includes('60')) return 'net-60';
  if (normalized.includes('receipt') || normalized.includes('cod')) return 'due-on-receipt';
  return 'net-30';
}

export function EditBillDialog({ open, onOpenChange, billId }: EditBillDialogProps) {
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [billDueDate, setBillDueDate] = useState<Date>();
  const [vendor, setVendor] = useState<string>("");
  const [terms, setTerms] = useState<string>("net-30");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [jobCostRows, setJobCostRows] = useState<ExpenseRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [deletedLineIds, setDeletedLineIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<BillAttachment[]>([]);
  
  const { updateBill } = useBills();
  const { openBillAttachment } = useUniversalFilePreviewContext();

  // Load bill data
  const { data: billData, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const { data: bill, error } = await supabase
        .from('bills')
        .select(`
          *,
          bill_lines (
            *,
            cost_codes (code, name),
            accounts (code, name)
          ),
          bill_attachments (*)
        `)
        .eq('id', billId)
        .single();

      if (error) throw error;
      return bill;
    },
    enabled: open && !!billId
  });

  // Populate form when bill data loads
  useEffect(() => {
    if (billData) {
      setBillDate(new Date(billData.bill_date));
      setBillDueDate(billData.due_date ? new Date(billData.due_date) : undefined);
      setVendor(billData.vendor_id);
      setTerms(normalizeTermsForUI(billData.terms));
      setReferenceNumber(billData.reference_number || '');
      
      // Populate job cost rows
      const jobCosts = billData.bill_lines
        .filter((line: any) => line.line_type === 'job_cost')
        .map((line: any, index: number) => ({
          id: `job-${index}`,
          dbId: line.id,
          account: line.cost_codes ? `${line.cost_codes.code}: ${line.cost_codes.name}` : '',
          accountId: line.cost_code_id || '',
          project: '',
          projectId: line.project_id || '',
          quantity: line.quantity?.toString() || '1',
          amount: line.unit_cost?.toString() || '0',
          memo: line.memo || ''
        }));

      setJobCostRows(jobCosts.length > 0 ? jobCosts : [
        { id: "1", account: "", accountId: "", project: "", projectId: billData.project_id || "", quantity: "", amount: "", memo: "" }
      ]);

      // Populate expense rows
      const expenses = billData.bill_lines
        .filter((line: any) => line.line_type === 'expense')
        .map((line: any, index: number) => ({
          id: `expense-${index}`,
          dbId: line.id,
          account: line.accounts ? `${line.accounts.code}: ${line.accounts.name}` : '',
          accountId: line.account_id || '',
          project: '',
          projectId: line.project_id || '',
          quantity: line.quantity?.toString() || '1',
          amount: line.unit_cost?.toString() || '0',
          memo: line.memo || ''
        }));

      setExpenseRows(expenses.length > 0 ? expenses : [
        { id: "1", account: "", accountId: "", project: "", projectId: billData.project_id || "", quantity: "", amount: "", memo: "" }
      ]);

      // Populate attachments
      setAttachments(billData.bill_attachments || []);
    }
  }, [billData]);

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

  const addJobCostRow = () => {
    const newRow: ExpenseRow = {
      id: Date.now().toString(),
      account: "",
      accountId: "",
      project: "",
      projectId: billData?.project_id || "",
      quantity: "",
      amount: "",
      memo: ""
    };
    setJobCostRows([...jobCostRows, newRow]);
  };

  const removeJobCostRow = (id: string, dbId?: string) => {
    if (jobCostRows.length > 1) {
      setJobCostRows(jobCostRows.filter(row => row.id !== id));
      if (dbId) {
        setDeletedLineIds([...deletedLineIds, dbId]);
      }
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
      projectId: billData?.project_id || "",
      quantity: "",
      amount: "",
      memo: ""
    };
    setExpenseRows([...expenseRows, newRow]);
  };

  const removeExpenseRow = (id: string, dbId?: string) => {
    if (expenseRows.length > 1) {
      setExpenseRows(expenseRows.filter(row => row.id !== id));
      if (dbId) {
        setDeletedLineIds([...deletedLineIds, dbId]);
      }
    }
  };

  const updateExpenseRow = (id: string, field: keyof ExpenseRow, value: string) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };


  const handleDeleteAttachment = async (attachment: BillAttachment) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('bill-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('bill_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      setAttachments(attachments.filter(a => a.id !== attachment.id));
      
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!vendor) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    if (!billData?.project_id) {
      toast({
        title: "Validation Error",
        description: "Bills must be associated with a project",
        variant: "destructive",
      });
      return;
    }

    const invalidJobCostRows = jobCostRows.filter(row => 
      parseFloat(row.amount) > 0 && !row.accountId
    );
    
    if (invalidJobCostRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "All job cost items must have a cost code selected",
        variant: "destructive",
      });
      return;
    }

    const invalidExpenseRows = expenseRows.filter(row => 
      parseFloat(row.amount) > 0 && !row.accountId
    );
    
    if (invalidExpenseRows.length > 0) {
      toast({
        title: "Validation Error",
        description: "All expense items must have an account selected",
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
          project_id: row.projectId || billData.project_id || undefined,
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) || 0,
          amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.amount) || 0),
          memo: row.memo || undefined
        })),
      ...expenseRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'expense' as const,
          account_id: row.accountId || undefined,
          project_id: row.projectId || billData.project_id || undefined,
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
      return;
    }

    const updateData = {
      vendor_id: vendor,
      project_id: billData.project_id,
      bill_date: billDate.toISOString().split('T')[0],
      due_date: billDueDate?.toISOString().split('T')[0],
      terms,
      reference_number: referenceNumber || undefined,
      notes: billData.notes || undefined
    };

    try {
      await updateBill.mutateAsync({ 
        billId, 
        billData: updateData, 
        billLines,
        deletedLineIds
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bill:', error);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            <DialogDescription>Loading bill data...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bill</DialogTitle>
          <DialogDescription>
            Make changes to this rejected bill. It will be sent back for review once saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                    onSelect={(date) => date && setBillDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refNo">Reference No.</Label>
              <Input 
                id="refNo" 
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter reference number" 
              />
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
                    onSelect={(date) => date && setBillDueDate(date)}
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

            {attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex items-center gap-2">
                  {attachments.map((attachment) => {
                    const IconComponent = getFileIcon(attachment.file_name);
                    const iconColorClass = getFileIconColor(attachment.file_name);
                    return (
                      <div key={attachment.id} className="relative group">
                        <button
                          onClick={() => openBillAttachment(attachment.file_path, attachment.file_name, {
                            id: attachment.id,
                            size: attachment.file_size,
                            mimeType: attachment.content_type
                          })}
                          className={`${iconColorClass} transition-colors p-1 rounded hover:bg-muted/50`}
                          title={attachment.file_name}
                          type="button"
                        >
                          <IconComponent className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition-colors"
                          title="Remove attachment"
                          type="button"
                        >
                          <span className="text-xs font-bold leading-none">×</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {billData?.notes && (
              <div className="space-y-2">
                <Label>Review Notes</Label>
                <div className="rounded-md border border-input bg-muted/50 p-3 text-sm">
                  {billData.notes.split('\n').map((line, idx) => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0 && colonIndex < 50) {
                      const name = line.substring(0, colonIndex);
                      const note = line.substring(colonIndex + 1);
                      return (
                        <div key={idx} className="mb-2 last:mb-0">
                          <span className="font-semibold text-foreground">{name}:</span>
                          <span>{note}</span>
                        </div>
                      );
                    }
                    return line ? <div key={idx} className="mb-2 last:mb-0">{line}</div> : null;
                  }).filter(Boolean)}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Line Items</h3>
            
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

                  {jobCostRows.map((row) => (
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
                          onChange={(projectId) => updateJobCostRow(row.id, 'projectId', projectId)}
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
                          onClick={() => removeJobCostRow(row.id, row.dbId)}
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
                      <div className="col-span-8 font-medium">
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
                  <div className="grid grid-cols-12 gap-2 p-3 bg-muted font-medium text-sm">
                    <div className="col-span-2">Account</div>
                    <div className="col-span-2">Project</div>
                    <div className="col-span-4">Memo</div>
                    <div className="col-span-1">Quantity</div>
                    <div className="col-span-1">Cost</div>
                    <div className="col-span-1">Total</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>

                  {expenseRows.map((row) => (
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
                          onChange={(projectId) => updateExpenseRow(row.id, 'projectId', projectId)}
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
                          onClick={() => removeExpenseRow(row.id, row.dbId)}
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
                      <div className="col-span-8 font-medium">
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
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={updateBill.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="flex-1"
              onClick={handleSave}
              disabled={updateBill.isPending}
            >
              {updateBill.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
