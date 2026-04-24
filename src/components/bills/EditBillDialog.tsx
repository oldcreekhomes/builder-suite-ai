import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { JobSearchInput } from "@/components/JobSearchInput";
import { format, addDays } from "date-fns";
import { CalendarIcon, Plus, Trash2, StickyNote } from "lucide-react";
import { getFileIcon, getFileIconColor, getCleanFileName } from '@/components/bidding/utils/fileIconUtils';
import { cn } from "@/lib/utils";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { useBills, BillLineData } from "@/hooks/useBills";
import { POSelectionDropdown } from "@/components/bills/POSelectionDropdown";
import { sanitizePoId } from "@/utils/poSentinelUtils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useLots } from "@/hooks/useLots";
import { useUniversalFilePreviewContext } from '@/components/files/UniversalFilePreviewProvider';
import { BillAttachmentUpload, BillAttachment as BillPDFAttachment } from "@/components/BillAttachmentUpload";
import { BillNotesDialog } from "./BillNotesDialog";
import { useReferenceNumberValidation } from "@/hooks/useReferenceNumberValidation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  lotId?: string;
  purchaseOrderId?: string;
  purchaseOrderLineId?: string;
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
  const [newAttachments, setNewAttachments] = useState<BillPDFAttachment[]>([]);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [responseNote, setResponseNote] = useState('');
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [showReviewNotesDialog, setShowReviewNotesDialog] = useState(false);
  
  const { updateBill, updateApprovedBill, correctBill } = useBills();
  const { openBillAttachment } = useUniversalFilePreviewContext();
  const { checkDuplicate } = useReferenceNumberValidation();

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

  const { lots } = useLots(billData?.project_id);
  const showAddressColumn = lots.length > 1;
  
  // Determine if bill is in read-only mode (approved, posted, or paid)
  const isApprovedBill = ['approved', 'posted', 'paid'].includes(billData?.status || '');

  // Fetch companies for the notes dialog - use separate cache key to avoid collision with full table data
  const { data: companies } = useQuery({
    queryKey: ['companies-dropdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name')
        .is('archived_at', null);
      if (error) throw error;
      return data;
    }
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
          lotId: line.lot_id || '',
          purchaseOrderId: line.purchase_order_id || undefined,
          purchaseOrderLineId: line.purchase_order_line_id || undefined,
          quantity: line.quantity?.toString() || '1',
          amount: line.unit_cost?.toString() || '0',
          memo: line.memo || ''
        }));

      setJobCostRows(jobCosts.length > 0 ? jobCosts : [
        { id: "1", account: "", accountId: "", project: "", projectId: billData.project_id || "", lotId: "", quantity: "", amount: "", memo: "" }
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
          lotId: line.lot_id || '',
          purchaseOrderId: line.purchase_order_id || undefined,
          purchaseOrderLineId: line.purchase_order_line_id || undefined,
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
      lotId: "",
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
    setJobCostRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
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
    setExpenseRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
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

    // Check for duplicate reference number (per-vendor uniqueness, exclude current bill)
    if (referenceNumber.trim()) {
      const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber, vendor, billId);
      if (isDuplicate && existingBill) {
        toast({
          title: "Duplicate Invoice Number",
          description: `Invoice #${referenceNumber} already exists for this vendor on project ${existingBill.projectName} (dated ${existingBill.billDate}).`,
          variant: "destructive",
        });
        return;
      }
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
          purchase_order_id: sanitizePoId(row.purchaseOrderId),
          purchase_order_line_id: sanitizePoId(row.purchaseOrderLineId),
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
          purchase_order_id: sanitizePoId(row.purchaseOrderId),
          purchase_order_line_id: sanitizePoId(row.purchaseOrderLineId),
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

    // Save directly without requiring review confirmation
    await handleConfirmedSave();
  };

  const handleConfirmedSave = async () => {
    // Combine internal notes with response note
    let finalNotes = internalNotes || billData.notes || undefined;
    
    if (responseNote && responseNote.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        const userName = userData 
          ? `${userData.first_name} ${userData.last_name}`.trim() 
          : 'Unknown User';
        
        const newNote = `${userName}: ${responseNote.trim()}`;
        
        if (finalNotes && finalNotes.trim()) {
          finalNotes = `${newNote}\n\n${finalNotes}`;
        } else {
          finalNotes = newNote;
        }
      }
    }

    const billLines: BillLineData[] = [
      ...jobCostRows
        .filter(row => row.accountId || row.amount)
        .map(row => ({
          line_type: 'job_cost' as const,
          cost_code_id: row.accountId || undefined,
          project_id: row.projectId || billData.project_id || undefined,
          lot_id: row.lotId || undefined,
          purchase_order_id: sanitizePoId(row.purchaseOrderId),
          purchase_order_line_id: sanitizePoId(row.purchaseOrderLineId),
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
          purchase_order_id: sanitizePoId(row.purchaseOrderId),
          purchase_order_line_id: sanitizePoId(row.purchaseOrderLineId),
          quantity: parseFloat(row.quantity) || 1,
          unit_cost: parseFloat(row.amount) || 0,
          amount: (parseFloat(row.quantity) || 1) * (parseFloat(row.amount) || 0),
          memo: row.memo || undefined
        }))
    ];

    const updateData = {
      vendor_id: vendor,
      project_id: billData.project_id,
      bill_date: billDate.toISOString().split('T')[0],
      due_date: billDueDate?.toISOString().split('T')[0],
      terms,
      reference_number: referenceNumber || undefined,
      notes: finalNotes
    };

    try {
      // For approved/posted/paid bills, use updateApprovedBill (no status change, no reversals)
      if (['approved', 'posted', 'paid'].includes(billData?.status)) {
        // Build list of bill line updates with their database IDs (include memo)
        const jobCostLineUpdates = jobCostRows
          .filter(row => row.dbId)
          .map(row => ({
            dbId: row.dbId!,
            cost_code_id: row.accountId || undefined,
            lot_id: row.lotId || undefined,
            purchase_order_id: sanitizePoId(row.purchaseOrderId),
            purchase_order_line_id: sanitizePoId(row.purchaseOrderLineId),
            memo: row.memo || undefined
          }));

        const expenseLineUpdates = expenseRows
          .filter(row => row.dbId)
          .map(row => ({
            dbId: row.dbId!,
            lot_id: row.lotId || undefined,
            purchase_order_id: sanitizePoId(row.purchaseOrderId),
            purchase_order_line_id: sanitizePoId(row.purchaseOrderLineId),
            memo: row.memo || undefined
          }));

        const lineUpdates = [...jobCostLineUpdates, ...expenseLineUpdates];

        await updateApprovedBill.mutateAsync({
          billId,
          billData: {
            bill_date: billDate.toISOString().split('T')[0],
            notes: finalNotes
          },
          billLines: lineUpdates
        });
      } else {
        // For draft bills, use regular updateBill
        await updateBill.mutateAsync({ 
          billId, 
          billData: updateData, 
          billLines,
          deletedLineIds
        });
      }

      // Upload new attachments
      if (newAttachments.length > 0) {
        for (const attachment of newAttachments) {
          if (attachment.id) continue; // Skip already uploaded

          try {
            const timestamp = Date.now();
            const sanitizedName = attachment.file_name
              .replace(/\s+/g, '_')
              .replace(/[^\w.-]/g, '_')
              .replace(/_+/g, '_');
            const fileName = `${timestamp}_${sanitizedName}`;
            const filePath = `${billId}/${fileName}`;

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
                bill_id: billId,
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
      
      setShowSaveConfirmation(false);
      setResponseNote('');
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
          {isApprovedBill 
            ? "Only date, cost code allocation, files, and notes can be modified for approved bills."
            : "Make changes to this bill."
          }
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
                  className="h-10"
                  disabled={isApprovedBill}
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
                  disabled={isApprovedBill}
                />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-2">
              <Label>Bill Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isApprovedBill}
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

            <div className="md:col-span-4 space-y-2">
              <Label htmlFor="terms">Terms</Label>
              <Select value={terms} onValueChange={setTerms} disabled={isApprovedBill}>
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

            <div className="md:col-span-2 space-y-2">
              <BillAttachmentUpload 
                attachments={newAttachments}
                onAttachmentsChange={setNewAttachments}
                billId={billId}
                disabled={false}
                existingAttachments={attachments}
                onDeleteExisting={handleDeleteAttachment}
                onClickExisting={(attachment) => openBillAttachment(attachment.file_path, attachment.file_name, {
                  id: attachment.id,
                  size: attachment.file_size,
                  mimeType: attachment.content_type
                })}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Internal Notes</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => setNotesDialogOpen(true)}
                >
                  {internalNotes.trim() ? (
                    <>
                      <StickyNote className="h-4 w-4 mr-2 text-yellow-600" />
                      View Notes
                    </>
                  ) : (
                    "Add Internal Notes"
                  )}
                </Button>
                {billData?.notes && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setShowReviewNotesDialog(true)}
                          className="text-yellow-600 transition-colors p-1 rounded hover:bg-muted/50"
                          title="View review notes"
                          type="button"
                        >
                          <StickyNote className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>View review notes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Tabs defaultValue="job-cost" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
                <TabsTrigger value="expense">Expense</TabsTrigger>
              </TabsList>
              
              <TabsContent value="job-cost" className="space-y-4">
                {!isApprovedBill && (
                  <div className="flex items-center justify-between">
                    <Button onClick={addJobCostRow} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <Table containerClassName="relative w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[210px]">Cost Code</TableHead>
                        <TableHead className="w-[240px]">Description</TableHead>
                        <TableHead className="w-[90px]">Quantity</TableHead>
                        <TableHead className="w-[100px]">Unit Cost</TableHead>
                        <TableHead className="w-[100px]">Total</TableHead>
                        {showAddressColumn && <TableHead className="w-[130px]">Address</TableHead>}
                        <TableHead className="w-[180px]">Purchase Order</TableHead>
                        {!isApprovedBill && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobCostRows.map((row) => {
                        const qty = parseFloat(row.quantity) || 0;
                        const cost = parseFloat(row.amount) || 0;
                        const total = Math.round(qty * cost * 100) / 100;
                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <CostCodeSearchInput
                                value={row.account}
                                onChange={(value) => updateJobCostRow(row.id, 'account', value)}
                                onCostCodeSelect={(costCode) => {
                                  updateJobCostRow(row.id, 'accountId', costCode.id);
                                  updateJobCostRow(row.id, 'account', `${costCode.code} - ${costCode.name}`);
                                }}
                                placeholder="Cost Code"
                                className="h-8 truncate"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Description"
                                value={row.memo}
                                onChange={(e) => updateJobCostRow(row.id, 'memo', e.target.value)}
                                className="h-8 truncate"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1"
                                value={row.quantity}
                                onChange={(e) => updateJobCostRow(row.id, 'quantity', e.target.value)}
                                className="h-7 px-1 border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isApprovedBill}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.amount}
                                onChange={(e) => updateJobCostRow(row.id, 'amount', e.target.value)}
                                className="h-7 px-1 border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isApprovedBill}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">${total.toFixed(2)}</span>
                            </TableCell>
                            {showAddressColumn && (
                              <TableCell>
                                <Select
                                  value={row.lotId || ''}
                                  onValueChange={(value) => updateJobCostRow(row.id, 'lotId', value)}
                                  disabled={isApprovedBill}
                                >
                                  <SelectTrigger className="h-8 w-full">
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {lots.map((lot) => (
                                      <SelectItem key={lot.id} value={lot.id}>
                                        {lot.lot_name || `Lot ${lot.lot_number}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            )}
                            <TableCell>
                              <POSelectionDropdown
                                projectId={billData?.project_id}
                                vendorId={vendor}
                                value={row.purchaseOrderId}
                                purchaseOrderLineId={row.purchaseOrderLineId}
                                onChange={(poId, poLineId) => {
                                  updateJobCostRow(row.id, 'purchaseOrderId', poId || '');
                                  updateJobCostRow(row.id, 'purchaseOrderLineId', poLineId || '');
                                }}
                                costCodeId={row.accountId}
                                className="h-8"
                              />
                            </TableCell>
                            {!isApprovedBill && (
                              <TableCell className="text-center">
                                <Button
                                  onClick={() => removeJobCostRow(row.id, row.dbId)}
                                  size="sm"
                                  variant="ghost"
                                  disabled={jobCostRows.length === 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="p-3 bg-muted border-t">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-medium whitespace-nowrap">
                        <span>
                          {jobCostRows.reduce((total, row) => {
                            const q = parseFloat(row.quantity) || 0;
                            const c = parseFloat(row.amount) || 0;
                            return total + Math.round(q * c * 100) / 100;
                          }, 0) < 0 ? 'Bill Credit Total:' : 'Job Cost Total:'}
                        </span>
                        <span className={cn(
                          jobCostRows.reduce((total, row) => {
                            const q = parseFloat(row.quantity) || 0;
                            const c = parseFloat(row.amount) || 0;
                            return total + Math.round(q * c * 100) / 100;
                          }, 0) < 0 && "text-green-600"
                        )}>
                          ${jobCostRows.reduce((total, row) => {
                            const q = parseFloat(row.quantity) || 0;
                            const c = parseFloat(row.amount) || 0;
                            return total + Math.round(q * c * 100) / 100;
                          }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={updateBill.isPending || correctBill.isPending}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={updateBill.isPending || correctBill.isPending}>
                          {updateBill.isPending || correctBill.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="expense" className="space-y-4">
                {!isApprovedBill && (
                  <div className="flex items-center justify-between">
                    <Button onClick={addExpenseRow} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <Table containerClassName="relative w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Account</TableHead>
                        <TableHead className="w-[180px]">Project</TableHead>
                        <TableHead className="w-[260px]">Description</TableHead>
                        <TableHead className="w-[90px]">Quantity</TableHead>
                        <TableHead className="w-[100px]">Unit Cost</TableHead>
                        <TableHead className="w-[100px]">Total</TableHead>
                        {!isApprovedBill && <TableHead className="w-[50px] text-center">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenseRows.map((row) => {
                        const qty = parseFloat(row.quantity) || 0;
                        const cost = parseFloat(row.amount) || 0;
                        const total = Math.round(qty * cost * 100) / 100;
                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <AccountSearchInput
                                value={row.accountId || ""}
                                onChange={(accountId) => updateExpenseRow(row.id, 'accountId', accountId)}
                                placeholder="Select account"
                                accountType="expense"
                                className="h-8"
                                disabled={isApprovedBill}
                              />
                            </TableCell>
                            <TableCell>
                              <JobSearchInput
                                value={row.projectId || ""}
                                onChange={(projectId) => updateExpenseRow(row.id, 'projectId', projectId)}
                                placeholder="Select project"
                                className="h-8"
                                disabled={isApprovedBill}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Description"
                                value={row.memo}
                                onChange={(e) => updateExpenseRow(row.id, 'memo', e.target.value)}
                                className="h-8 truncate"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1"
                                value={row.quantity}
                                onChange={(e) => updateExpenseRow(row.id, 'quantity', e.target.value)}
                                className="h-7 px-1 border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isApprovedBill}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={row.amount}
                                onChange={(e) => updateExpenseRow(row.id, 'amount', e.target.value)}
                                className="h-7 px-1 border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 text-sm font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isApprovedBill}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">${total.toFixed(2)}</span>
                            </TableCell>
                            {!isApprovedBill && (
                              <TableCell className="text-center">
                                <Button
                                  onClick={() => removeExpenseRow(row.id, row.dbId)}
                                  size="sm"
                                  variant="ghost"
                                  disabled={expenseRows.length === 1}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="p-3 bg-muted border-t">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 font-medium whitespace-nowrap">
                        <span>
                          {expenseRows.reduce((total, row) => {
                            const q = parseFloat(row.quantity) || 0;
                            const c = parseFloat(row.amount) || 0;
                            return total + Math.round(q * c * 100) / 100;
                          }, 0) < 0 ? 'Bill Credit Total:' : 'Expense Total:'}
                        </span>
                        <span className={cn(
                          expenseRows.reduce((total, row) => {
                            const q = parseFloat(row.quantity) || 0;
                            const c = parseFloat(row.amount) || 0;
                            return total + Math.round(q * c * 100) / 100;
                          }, 0) < 0 && "text-green-600"
                        )}>
                          ${expenseRows.reduce((total, row) => {
                            const q = parseFloat(row.quantity) || 0;
                            const c = parseFloat(row.amount) || 0;
                            return total + Math.round(q * c * 100) / 100;
                          }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={updateBill.isPending || correctBill.isPending}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={updateBill.isPending || correctBill.isPending}>
                          {updateBill.isPending || correctBill.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>

        <AlertDialog open={showSaveConfirmation} onOpenChange={setShowSaveConfirmation}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Bill Back for Review</AlertDialogTitle>
            </AlertDialogHeader>
            
            <div className="space-y-2">
              <Label htmlFor="response-note">Response Note *</Label>
              <Textarea
                id="response-note"
                placeholder="Explain what you fixed or changed..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">
                Required: This note will be visible to the reviewer to help them understand your changes.
              </p>
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowSaveConfirmation(false);
                setResponseNote('');
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmedSave}
                className="bg-primary hover:bg-primary/90"
                disabled={!responseNote.trim()}
              >
                Save & Send for Review
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BillNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          billInfo={{
            vendor: companies?.find(c => c.id === vendor)?.company_name || 'Unknown Vendor',
            amount: [...jobCostRows, ...expenseRows].reduce((total, row) => {
              const q = parseFloat(row.quantity) || 0;
              const c = parseFloat(row.amount) || 0;
              return total + Math.round(q * c * 100) / 100;
            }, 0)
          }}
          initialValue={internalNotes}
          onSave={setInternalNotes}
        />

        {/* Review Notes Dialog */}
        <Dialog open={showReviewNotesDialog} onOpenChange={setShowReviewNotesDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-yellow-600" />
                Review Notes
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-md border border-input bg-muted/50 p-3 text-sm max-h-64 overflow-y-auto">
              {billData?.notes?.split('\n').map((line, idx) => {
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
            <DialogFooter>
              <Button onClick={() => setShowReviewNotesDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
