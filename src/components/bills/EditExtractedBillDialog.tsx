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
import { normalizeToYMD, toDateLocal } from "@/utils/dateOnly";
import { usePendingBills } from "@/hooks/usePendingBills";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFileIcon, getFileIconColor } from "@/components/bidding/utils/fileIconUtils";
import { useUniversalFilePreviewContext } from "@/components/files/UniversalFilePreviewProvider";

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
  cost_code_display?: string;
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
  const [activeTab, setActiveTab] = useState<string>("job-cost");
  const [defaultCostCodeId, setDefaultCostCodeId] = useState<string | null>(null);
  const { openBillAttachment } = useUniversalFilePreviewContext();

  // Load bill data
  useEffect(() => {
    if (!open || !pendingUploadId) return;

    const loadBillData = async () => {
      const bill = pendingBills?.find(b => b.id === pendingUploadId);
      if (!bill) return;

      const extractedData = bill.extracted_data || {};
      const extractedVendorId = extractedData.vendor_id || extractedData.vendorId || "";
      
      setVendorId(extractedVendorId);
      setRefNo(extractedData.referenceNumber || "");
      setTerms(extractedData.terms || "net-30");
      setFileName(bill.file_name);
      setFilePath(bill.file_path);

      if (extractedData.bill_date || extractedData.billDate) {
        setBillDate(toDateLocal(normalizeToYMD(extractedData.bill_date || extractedData.billDate)));
      }
      if (extractedData.due_date || extractedData.dueDate) {
        setDueDate(toDateLocal(normalizeToYMD(extractedData.due_date || extractedData.dueDate)));
      }

      // Fetch default cost code if vendor has exactly 1
      let defaultCostCode: string | null = null;
      if (extractedVendorId) {
        const { data: costCodeData } = await supabase
          .from('company_cost_codes')
          .select('cost_code_id')
          .eq('company_id', extractedVendorId);

        if (costCodeData && costCodeData.length === 1) {
          defaultCostCode = costCodeData[0].cost_code_id;
          setDefaultCostCodeId(defaultCostCode);
        }
      }

      // Fetch line items
      const { data } = await supabase
        .from('pending_bill_lines')
        .select('*')
        .eq('pending_upload_id', pendingUploadId)
        .order('line_number');

      if (data) {
          const extractedTotal = Number(extractedData.totalAmount || extractedData.total_amount) || 0;
          const isSingleLine = data.length === 1;
          
          // Build job cost and expense arrays, promoting expense lines to job_cost when a single default cost code exists
          const jobCost: LineItem[] = [];
          const expense: LineItem[] = [];

          for (const line of data) {
            let qty = Number(line.quantity) || 1;
            let amt = Number(line.amount) || 0;

            // SANITY CHECKS common to both types
            if (isSingleLine && extractedTotal > 0 && Math.abs(amt - extractedTotal) > 0.01) {
              console.log(`Correcting line amount from ${amt} to extracted total ${extractedTotal}`);
              amt = extractedTotal;
            }
            if (amt > 1000000 && qty > 0) {
              const reasonableUnitCost = extractedTotal > 0 ? extractedTotal / qty : 100;
              console.log(`Correcting absurd amount ${amt} to ${reasonableUnitCost * qty}`);
              amt = reasonableUnitCost * qty;
            }
            const unitCost = amt > 0 && qty > 0 ? Math.round((amt / qty) * 100) / 100 : 0;

            // Fetch cost code display string if applicable
            let costCodeDisplay = '';
            const costCodeToUse = line.cost_code_id || defaultCostCode;
            if (costCodeToUse) {
              const { data: ccData } = await supabase
                .from('cost_codes')
                .select('code, name')
                .eq('id', costCodeToUse)
                .single();
              if (ccData) {
                costCodeDisplay = `${ccData.code} - ${ccData.name}`;
              }
            }

            if (line.line_type === 'job_cost') {
              jobCost.push({
                id: line.id,
                line_type: 'job_cost',
                cost_code_id: costCodeToUse || undefined,
                cost_code_display: costCodeDisplay || undefined,
                quantity: qty,
                unit_cost: unitCost,
                amount: amt,
                memo: line.memo || "",
              });
            } else if (line.line_type === 'expense') {
              // If vendor has exactly one cost code and the expense line isn't categorized, promote it to job_cost
              if (defaultCostCode && !line.account_id && !line.cost_code_id) {
                jobCost.push({
                  id: line.id,
                  line_type: 'job_cost',
                  cost_code_id: defaultCostCode,
                  cost_code_display: costCodeDisplay || undefined,
                  quantity: qty,
                  unit_cost: unitCost,
                  amount: amt,
                  memo: line.memo || "",
                });
              } else {
                expense.push({
                  id: line.id,
                  line_type: 'expense',
                  account_id: line.account_id || undefined,
                  quantity: qty,
                  unit_cost: unitCost,
                  amount: amt,
                  memo: line.memo || "",
                });
              }
            }
          }

          setJobCostLines(jobCost);
          setExpenseLines(expense);

          // Default to the tab that has data
          if (expense.length > 0 && jobCost.length === 0) {
            setActiveTab("expense");
          } else if (jobCost.length > 0) {
            setActiveTab("job-cost");
          }
      }
    };

    loadBillData();
  }, [open, pendingUploadId, pendingBills]);

  // Re-apply default cost code when vendor changes
  useEffect(() => {
    if (!open || !vendorId) return;
    const applyDefault = async () => {
      const { data: cc } = await supabase
        .from('company_cost_codes')
        .select('cost_code_id')
        .eq('company_id', vendorId);
      if (cc && cc.length === 1) {
        const id = cc[0].cost_code_id as string;
        setDefaultCostCodeId(id);
        
        // Fetch display string for default cost code
        const { data: ccData } = await supabase
          .from('cost_codes')
          .select('code, name')
          .eq('id', id)
          .single();
        const display = ccData ? `${ccData.code} - ${ccData.name}` : '';
        
        setJobCostLines(prev => prev.map(l => ({ 
          ...l, 
          cost_code_id: l.cost_code_id || id,
          cost_code_display: l.cost_code_display || display
        })));
        setExpenseLines(prev => {
          const keep: LineItem[] = [];
          const promote: LineItem[] = [];
          prev.forEach(l => {
            if (!l.account_id && !l.cost_code_id) {
              promote.push({ ...l, line_type: 'job_cost', cost_code_id: id, cost_code_display: display });
            } else {
              keep.push(l);
            }
          });
          if (promote.length) {
            setJobCostLines(prevJ => [...prevJ, ...promote]);
          }
          return keep;
        });
      } else {
        setDefaultCostCodeId(null);
      }
    };
    applyDefault();
  }, [vendorId, open]);

  const createEmptyLine = (type: 'job_cost' | 'expense'): LineItem => ({
    id: `new-${Date.now()}`,
    line_type: type,
    quantity: 1,
    unit_cost: 0,
    amount: 0,
    memo: "",
    ...(type === 'job_cost' && defaultCostCodeId ? { cost_code_id: defaultCostCodeId } : {}),
  });

  const addJobCostLine = async () => {
    const newLine: LineItem = {
      id: `new-${Date.now()}`,
      line_type: 'job_cost',
      quantity: 1,
      unit_cost: 0,
      amount: 0,
      memo: "",
    };

    // If there's a default cost code, fetch and add its display string
    if (defaultCostCodeId) {
      const { data: ccData } = await supabase
        .from('cost_codes')
        .select('code, name')
        .eq('id', defaultCostCodeId)
        .single();
      
      newLine.cost_code_id = defaultCostCodeId;
      newLine.cost_code_display = ccData ? `${ccData.code} - ${ccData.name}` : '';
    }

    setJobCostLines([...jobCostLines, newLine]);
  };

  const addExpenseLine = () => {
    setExpenseLines([...expenseLines, createEmptyLine('expense')]);
  };

  const removeJobCostLine = (id: string) => {
    setJobCostLines(jobCostLines.filter(line => line.id !== id));
    if (!id.startsWith('new-')) {
      deleteLine.mutate(id);
    }
  };

  const removeExpenseLine = (id: string) => {
    setExpenseLines(expenseLines.filter(line => line.id !== id));
    if (!id.startsWith('new-')) {
      deleteLine.mutate(id);
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
        // If cost_code_display is being updated, keep cost_code_id in sync
        if (field === 'cost_code_display') {
          // The display value is being updated, cost_code_id should be set via onCostCodeSelect
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
    const sumSafe = (arr: LineItem[]) => arr.reduce((s, l) => {
      const v = Number(l.amount);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0);
    return (sumSafe(jobCostLines) + sumSafe(expenseLines)).toFixed(2);
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

    // Get current bill to check if vendor changed
    const currentBill = pendingBills?.find(b => b.id === pendingUploadId);
    const originalVendorId = currentBill?.extracted_data?.vendor_id || currentBill?.extracted_data?.vendorId;
    const originalVendorName = currentBill?.extracted_data?.vendor_name || currentBill?.extracted_data?.vendor;

    // Query vendor name
    const { data: vendorData } = await supabase
      .from('companies')
      .select('company_name')
      .eq('id', vendorId)
      .single();

    // Update pending bill with basic info - save dates as YYYY-MM-DD (both naming conventions)
    const billDateStr = normalizeToYMD(billDate);
    const dueDateStr = dueDate ? normalizeToYMD(dueDate) : null;
    
    await supabase
      .from('pending_bill_uploads')
      .update({
        extracted_data: {
          vendorId,
          vendor_id: vendorId,
          vendor_name: vendorData?.company_name || '',
          bill_date: billDateStr,
          billDate: billDateStr,
          due_date: dueDateStr,
          dueDate: dueDateStr,
          referenceNumber: refNo,
          terms,
        },
      })
      .eq('id', pendingUploadId);

    // Save all lines with display names
    const allLines = [...jobCostLines, ...expenseLines];
    for (const line of allLines) {
      // Query display names for this line
      let accountName = '';
      let costCodeName = '';
      let projectName = '';

      if (line.account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('code, name')
          .eq('id', line.account_id)
          .single();
        accountName = accountData ? `${accountData.code}: ${accountData.name}` : '';
      }

      if (line.cost_code_id) {
        const { data: costCodeData } = await supabase
          .from('cost_codes')
          .select('code, name')
          .eq('id', line.cost_code_id)
          .single();
        costCodeName = costCodeData ? `${costCodeData.code}: ${costCodeData.name}` : '';
      }

      if (line.id.startsWith('new-')) {
        // Add new line
        await addLine.mutateAsync({
          pendingUploadId,
          lineData: {
            line_number: 1,
            line_type: line.line_type as 'expense' | 'job_cost',
            account_id: line.account_id,
            account_name: accountName,
            cost_code_id: line.cost_code_id,
            cost_code_name: costCodeName,
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
            line_type: line.line_type as 'expense' | 'job_cost',
            account_id: line.account_id,
            account_name: accountName,
            cost_code_id: line.cost_code_id,
            cost_code_name: costCodeName,
            quantity: line.quantity,
            unit_cost: line.unit_cost,
            amount: line.amount,
            memo: line.memo,
          },
        });
      }
    }

    // Save vendor alias if vendor was changed
    if (originalVendorId !== vendorId && originalVendorName && originalVendorName.trim()) {
      try {
        // Normalize the alias
        const normalizedAlias = String(originalVendorName)
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s]/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\b(llc|inc|incorporated|corp|corporation|ltd|limited|co|company)\b/gi, '')
          .trim();
        
        // Get current user to determine owner_id
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get effective owner ID (owner or home_builder_id if employee)
          const { data: userData } = await supabase
            .from('users')
            .select('role, home_builder_id')
            .eq('id', user.id)
            .single();
          
          const effectiveOwnerId = (userData?.role === 'employee' && userData?.home_builder_id)
            ? userData.home_builder_id
            : user.id;
          
          // Upsert the alias (idempotent - won't fail if already exists)
          const { error: aliasError } = await supabase
            .from('vendor_aliases')
            .upsert({
              owner_id: effectiveOwnerId,
              company_id: vendorId,
              alias: String(originalVendorName).trim(),
              normalized_alias: normalizedAlias,
            }, {
              onConflict: 'owner_id,normalized_alias'
            });
          
          if (aliasError) {
            console.error('Failed to save vendor alias:', aliasError);
          } else {
            console.log(`Saved vendor alias: "${originalVendorName}" → ${vendorData?.company_name || 'selected vendor'}`);
          }
        }
      } catch (err) {
        console.error('Error saving vendor alias:', err);
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
                  <SelectItem value="due-on-receipt">On Receipt</SelectItem>
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
                      openBillAttachment(filePath, displayName);
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="job-cost">Job Cost</TabsTrigger>
              <TabsTrigger value="expense">Expense</TabsTrigger>
            </TabsList>

            <TabsContent value="job-cost" className="space-y-4">
              {jobCostLines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No job cost lines. Click "Add Line" to add one.
                </div>
              ) : (
                <Table containerClassName="relative w-full overflow-x-auto overflow-y-visible max-h-none">
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
                          value={line.cost_code_display || ""}
                          onChange={(value) => updateJobCostLine(line.id, 'cost_code_display', value)}
                          onCostCodeSelect={(costCode) => {
                            if (costCode) {
                              const display = `${costCode.code} - ${costCode.name}`;
                              setJobCostLines(lines =>
                                lines.map(l => 
                                  l.id === line.id 
                                    ? { ...l, cost_code_id: costCode.id, cost_code_display: display }
                                    : l
                                )
                              );
                            }
                          }}
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
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
              <Button onClick={addJobCostLine} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </TabsContent>

            <TabsContent value="expense" className="space-y-4">
              {expenseLines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No expense lines. Click "Add Line" to add one.
                </div>
              ) : (
                <Table containerClassName="relative w-full overflow-x-auto overflow-y-visible max-h-none">
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
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
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
