import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePendingBills } from "@/hooks/usePendingBills";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { openFileViaRedirect } from "@/utils/fileOpenUtils";

interface EditExtractedBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUploadId: string;
}

interface LineItem {
  id: string;
  line_type: string;
  account_id?: string;
  cost_code_id?: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  memo?: string;
}

export function EditExtractedBillDialog({
  open,
  onOpenChange,
  pendingUploadId,
}: EditExtractedBillDialogProps) {
  const { pendingBills, updateLine, addLine, deleteLine } = usePendingBills();
  const [vendorId, setVendorId] = useState<string>("");
  const [billDate, setBillDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>();
  const [refNo, setRefNo] = useState<string>("");
  const [terms, setTerms] = useState<string>("net-30");
  const [jobCostLines, setJobCostLines] = useState<LineItem[]>([]);
  const [expenseLines, setExpenseLines] = useState<LineItem[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [filePath, setFilePath] = useState<string>("");

  // Load bill data
  useEffect(() => {
    if (!open || !pendingUploadId) return;

    const bill = pendingBills?.find(b => b.id === pendingUploadId);
    if (!bill) return;

    const extractedData = bill.extracted_data || {};
    setVendorId(extractedData.vendorId || "");
    setRefNo(extractedData.referenceNumber || "");
    setTerms(extractedData.terms || "net-30");
    setFileName(bill.file_name);
    setFilePath(bill.file_path);

    if (extractedData.billDate) {
      setBillDate(new Date(extractedData.billDate));
    }
    if (extractedData.dueDate) {
      setDueDate(new Date(extractedData.dueDate));
    }

    // Fetch line items
    supabase
      .from('pending_bill_lines')
      .select('*')
      .eq('pending_upload_id', pendingUploadId)
      .order('line_number')
      .then(({ data }) => {
        if (data) {
          const jobCost = data
            .filter(line => line.line_type === 'job_cost')
            .map(line => ({
              id: line.id,
              line_type: line.line_type,
              cost_code_id: line.cost_code_id || undefined,
              quantity: line.quantity || 1,
              unit_cost: line.unit_cost || 0,
              amount: (line.quantity || 1) * (line.unit_cost || 0),
              memo: line.memo || "",
            }));
          
          const expense = data
            .filter(line => line.line_type === 'expense')
            .map(line => ({
              id: line.id,
              line_type: line.line_type,
              account_id: line.account_id || undefined,
              quantity: line.quantity || 1,
              unit_cost: line.unit_cost || 0,
              amount: (line.quantity || 1) * (line.unit_cost || 0),
              memo: line.memo || "",
            }));

          setJobCostLines(jobCost.length > 0 ? jobCost : [createEmptyLine('job_cost')]);
          setExpenseLines(expense.length > 0 ? expense : [createEmptyLine('expense')]);
        }
      });
  }, [open, pendingUploadId, pendingBills]);

  const createEmptyLine = (type: 'job_cost' | 'expense'): LineItem => ({
    id: `new-${Date.now()}`,
    line_type: type,
    quantity: 1,
    unit_cost: 0,
    amount: 0,
    memo: "",
  });

  const addJobCostLine = () => {
    setJobCostLines([...jobCostLines, createEmptyLine('job_cost')]);
  };

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, createEmptyLine('expense')]);
  };

  const removeJobCostLine = (id: string) => {
    if (jobCostLines.length > 1) {
      setJobCostLines(jobCostLines.filter(line => line.id !== id));
      if (!id.startsWith('new-')) {
        deleteLine.mutate(id);
      }
    }
  };

  const removeExpenseLine = (id: string) => {
    if (expenseLines.length > 1) {
      setExpenseLines(expenseLines.filter(line => line.id !== id));
      if (!id.startsWith('new-')) {
        deleteLine.mutate(id);
      }
    }
  };

  const updateJobCostLine = (id: string, field: keyof LineItem, value: any) => {
    setJobCostLines(lines =>
      lines.map(line => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.amount = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        return updated;
      })
    );
  };

  const updateExpenseLine = (id: string, field: keyof LineItem, value: any) => {
    setExpenseLines(lines =>
      lines.map(line => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };
        if (field === 'quantity' || field === 'unit_cost') {
          updated.amount = (updated.quantity || 0) * (updated.unit_cost || 0);
        }
        return updated;
      })
    );
  };

  const calculateTotal = () => {
    const jobCostTotal = jobCostLines.reduce((sum, line) => sum + (line.amount || 0), 0);
    const expenseTotal = expenseLines.reduce((sum, line) => sum + (line.amount || 0), 0);
    return (jobCostTotal + expenseTotal).toFixed(2);
  };

  const handleSave = async () => {
    if (!vendorId) {
      toast({
        title: "Validation Error",
        description: "Please select a vendor",
        variant: "destructive",
      });
      return;
    }

    // Update pending bill with basic info
    await supabase
      .from('pending_bill_uploads')
      .update({
        extracted_data: {
          vendorId,
          billDate: billDate.toISOString(),
          dueDate: dueDate?.toISOString(),
          referenceNumber: refNo,
          terms,
        },
      })
      .eq('id', pendingUploadId);

    // Save all lines
    const allLines = [...jobCostLines, ...expenseLines];
    for (const line of allLines) {
      if (line.id.startsWith('new-')) {
        // Add new line
        await addLine.mutateAsync({
          pendingUploadId,
          lineData: {
            line_number: 1,
            line_type: line.line_type as 'expense' | 'job_cost',
            account_id: line.account_id,
            cost_code_id: line.cost_code_id,
            quantity: line.quantity,
            unit_cost: line.unit_cost,
            amount: line.amount,
            memo: line.memo,
          },
        });
      } else {
        // Update existing line
        await updateLine.mutateAsync({
          lineId: line.id,
          updates: {
            account_id: line.account_id,
            cost_code_id: line.cost_code_id,
            quantity: line.quantity,
            unit_cost: line.unit_cost,
            amount: line.amount,
            memo: line.memo,
          },
        });
      }
    }

    toast({
      title: "Success",
      description: "Bill updated successfully",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Extracted Bill</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <VendorSearchInput value={vendorId} onChange={setVendorId} />
            </div>
            <div className="space-y-2">
              <Label>Bill Date *</Label>
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
                    {billDate ? format(billDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={billDate}
                    onSelect={(date) => date && setBillDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reference No.</Label>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Terms</Label>
              <Select value={terms} onValueChange={setTerms}>
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Attachment</Label>
              <div>
                <div className="relative group inline-block">
                  <button
                    onClick={() => {
                      const displayName = fileName.split('/').pop() || fileName;
                      openFileViaRedirect('bill-attachments', filePath, displayName);
                    }}
                    className={`${getFileIconColor(fileName)} transition-colors p-1`}
                    title={fileName}
                    type="button"
                  >
                    {(() => {
                      const IconComponent = getFileIcon(fileName);
                      return <IconComponent className="h-4 w-4" />;
                    })()}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Note: This deletes the entire pending bill upload
                      if (confirm('Delete this bill attachment? This will remove the entire bill from the queue.')) {
                        onOpenChange(false);
                        // Trigger deletion through parent component if needed
                      }
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-3 h-3 flex items-center justify-center transition-opacity"
                    title="Delete file"
                    type="button"
                  >
                    <span className="text-xs font-bold leading-none">×</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <Tabs defaultValue="job-cost" className="w-full">
            <TabsList>
              <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
            </TabsList>

            <TabsContent value="job-cost" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Cost Code</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="w-[120px]">Unit Cost</TableHead>
                    <TableHead className="w-[120px]">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobCostLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <CostCodeSearchInput
                          value={line.cost_code_id || ""}
                          onChange={(value) => updateJobCostLine(line.id, 'cost_code_id', value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.memo || ""}
                          onChange={(e) => updateJobCostLine(line.id, 'memo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateJobCostLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_cost}
                          onChange={(e) => updateJobCostLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${line.amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJobCostLine(line.id)}
                          disabled={jobCostLines.length === 1}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 disabled:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={addJobCostLine} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </TabsContent>

            <TabsContent value="expense" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Account</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="w-[120px]">Unit Cost</TableHead>
                    <TableHead className="w-[120px]">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseLines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <AccountSearchInput
                          value={line.account_id || ""}
                          onChange={(value) => updateExpenseLine(line.id, 'account_id', value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.memo || ""}
                          onChange={(e) => updateExpenseLine(line.id, 'memo', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => updateExpenseLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_cost}
                          onChange={(e) => updateExpenseLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${line.amount.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExpenseLine(line.id)}
                          disabled={expenseLines.length === 1}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 disabled:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={addExpenseLine} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </TabsContent>
          </Tabs>

          {/* Total */}
          <div className="flex justify-end items-center gap-4 pt-4 border-t">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold">${calculateTotal()}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
