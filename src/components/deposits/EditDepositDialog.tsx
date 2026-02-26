import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { AccountSearchInputInline } from "@/components/AccountSearchInputInline";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccounts } from "@/hooks/useAccounts";
import { useDeposits, DepositData, DepositLineData } from "@/hooks/useDeposits";
import { useCostCodeSearch } from "@/hooks/useCostCodeSearch";
import { useLots } from "@/hooks/useLots";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toDateLocal } from "@/utils/dateOnly";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DepositAttachmentUpload, DepositAttachment } from "@/components/deposits/DepositAttachmentUpload";

interface EditDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depositId: string;
}

interface DepositRow {
  id: string;
  account: string;
  accountId?: string;
  costCodeId?: string;
  quantity: string;
  amount: string;
  memo: string;
  lotId?: string;
}

export function EditDepositDialog({ open, onOpenChange, depositId }: EditDepositDialogProps) {
  const [depositDate, setDepositDate] = useState<Date>(new Date());
  const [depositSourceId, setDepositSourceId] = useState<string>("");
  const [depositSourceName, setDepositSourceName] = useState<string>("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("other");
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<DepositAttachment[]>([]);

  const [revenueRows, setRevenueRows] = useState<DepositRow[]>([
    { id: "1", account: "", accountId: "", quantity: "1", amount: "", memo: "" }
  ]);
  const [otherRows, setOtherRows] = useState<DepositRow[]>([
    { id: "1", account: "", accountId: "", quantity: "1", amount: "", memo: "" }
  ]);

  const { accounts } = useAccounts();
  const { updateDepositFull } = useDeposits();
  const { costCodes } = useCostCodeSearch();

  // Load deposit data
  const { data: depositData, isLoading } = useQuery({
    queryKey: ['deposit-edit', depositId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deposits')
        .select(`
          *,
          companies:company_id (id, company_name),
          deposit_lines (
            id, amount, memo, lot_id, account_id, cost_code_id, line_type, line_number
          ),
          deposit_attachments (id, file_name, file_path, file_size, content_type)
        `)
        .eq('id', depositId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && !!depositId,
  });

  const { lots } = useLots(depositData?.project_id);
  const showAddressColumn = lots.length > 1;

  // Populate form when data loads
  useEffect(() => {
    if (!depositData || !accounts.length) return;

    setDepositDate(toDateLocal(depositData.deposit_date));
    setCheckNumber(depositData.check_number || "");

    const bankAcct = accounts.find(a => a.id === depositData.bank_account_id);
    if (bankAcct) {
      setBankAccountId(bankAcct.id);
      setBankAccount(`${bankAcct.code} - ${bankAcct.name}`);
    }

    if (depositData.company_id && depositData.companies) {
      setDepositSourceName((depositData.companies as any).company_name);
      setDepositSourceId(depositData.company_id);
    } else {
      setDepositSourceName(depositData.memo || "");
      setDepositSourceId("");
    }

    // Map lines
    const newRevenueRows: DepositRow[] = [];
    const newOtherRows: DepositRow[] = [];
    const lines = depositData.deposit_lines || [];

    for (const line of lines) {
      const row: DepositRow = {
        id: line.id,
        account: "",
        accountId: line.account_id || "",
        costCodeId: line.cost_code_id || "",
        quantity: "1",
        amount: String(line.amount || 0),
        memo: line.memo || "",
        lotId: line.lot_id || "",
      };

      if (line.line_type === 'customer_payment') {
        const costCode = costCodes.find(cc => cc.id === line.cost_code_id);
        if (costCode) row.account = `${costCode.code} - ${costCode.name}`;
        newRevenueRows.push(row);
      } else {
        const account = accounts.find(a => a.id === line.account_id);
        if (account) row.account = `${account.code} - ${account.name}`;
        newOtherRows.push(row);
      }
    }

    setRevenueRows(newRevenueRows.length > 0 ? newRevenueRows : [{ id: "1", account: "", accountId: "", quantity: "1", amount: "", memo: "" }]);
    setOtherRows(newOtherRows.length > 0 ? newOtherRows : [{ id: "1", account: "", accountId: "", quantity: "1", amount: "", memo: "" }]);

    if (newOtherRows.length > 0) setActiveTab("other");
    else if (newRevenueRows.length > 0) setActiveTab("revenue");
    else setActiveTab("other");

    // Attachments
    setAttachments((depositData.deposit_attachments || []).map((att: any) => ({
      id: att.id,
      file_name: att.file_name,
      file_path: att.file_path,
      file_size: att.file_size,
      content_type: att.content_type || '',
    })));
  }, [depositData, accounts, costCodes]);

  const bankAccounts = useMemo(() => 
    accounts.filter(a => a.type === 'asset' && (a.name.toLowerCase().includes('bank') || a.name.toLowerCase().includes('checking') || a.name.toLowerCase().includes('savings') || a.code.startsWith('1000') || a.code.startsWith('1010') || a.code.startsWith('1020'))),
    [accounts]
  );

  const calculateTotal = () => {
    const revenueTotal = revenueRows.reduce((sum, row) => sum + ((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)), 0);
    const otherTotal = otherRows.reduce((sum, row) => sum + ((parseFloat(row.quantity || "0") || 0) * (parseFloat(row.amount || "0") || 0)), 0);
    return revenueTotal + otherTotal;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

  const addRow = (type: 'revenue' | 'other') => {
    const newRow: DepositRow = { id: Date.now().toString(), account: "", accountId: "", quantity: "1", amount: "", memo: "" };
    if (type === 'revenue') setRevenueRows(prev => [...prev, newRow]);
    else setOtherRows(prev => [...prev, newRow]);
  };

  const removeRow = (type: 'revenue' | 'other', id: string) => {
    if (type === 'revenue') {
      if (revenueRows.length > 1) setRevenueRows(prev => prev.filter(r => r.id !== id));
    } else {
      if (otherRows.length > 1) setOtherRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateRow = (type: 'revenue' | 'other', id: string, field: keyof DepositRow, value: string) => {
    const setter = type === 'revenue' ? setRevenueRows : setOtherRows;
    setter(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (!depositSourceName) {
        toast({ title: "Validation Error", description: "Please enter who the deposit is from", variant: "destructive" });
        return;
      }

      if (!bankAccountId) {
        toast({ title: "Validation Error", description: "Please select a bank account", variant: "destructive" });
        return;
      }

      const chartLines: DepositLineData[] = otherRows
        .filter(row => row.accountId && ((parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0)) > 0)
        .map(row => ({
          line_type: 'revenue' as const,
          account_id: row.accountId!,
          project_id: depositData?.project_id || undefined,
          lot_id: row.lotId || undefined,
          amount: (parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0),
          memo: row.memo || undefined,
        }));

      const jobCostLines: DepositLineData[] = revenueRows
        .filter(row => row.costCodeId && ((parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0)) > 0)
        .map(row => ({
          line_type: 'customer_payment' as const,
          cost_code_id: row.costCodeId!,
          project_id: depositData?.project_id || undefined,
          lot_id: row.lotId || undefined,
          amount: (parseFloat(row.quantity || "1") || 0) * (parseFloat(row.amount || "0") || 0),
          memo: row.memo || undefined,
        }));

      const depositLines = [...chartLines, ...jobCostLines];

      if (depositLines.length === 0) {
        toast({ title: "Validation Error", description: "Please add at least one line item", variant: "destructive" });
        return;
      }

      const total = calculateTotal();

      const updatedDepositData: DepositData = {
        deposit_date: depositDate.toISOString().split('T')[0],
        bank_account_id: bankAccountId,
        project_id: depositData?.project_id || undefined,
        amount: total,
        memo: depositSourceName,
        company_id: depositSourceId || undefined,
        check_number: checkNumber || undefined,
        company_name: depositData?.company_name,
        company_address: depositData?.company_address,
        company_city_state: depositData?.company_city_state,
        bank_name: depositData?.bank_name,
        routing_number: depositData?.routing_number,
        account_number: depositData?.account_number,
      };

      await updateDepositFull.mutateAsync({
        depositId,
        depositData: updatedDepositData,
        depositLines,
      });

      // Upload any new temp attachments
      for (const attachment of attachments.filter(a => (a as any).file && !a.id)) {
        const file = (attachment as any).file as File;
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '_').replace(/_+/g, '_');
        const filePath = `deposit-attachments/${depositId}/${timestamp}_${sanitizedName}`;

        await supabase.storage.from('project-files').upload(filePath, file);
        await supabase.from('deposit_attachments').insert([{
          deposit_id: depositId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        }]);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving deposit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderLineItems = (type: 'revenue' | 'other') => {
    const rows = type === 'revenue' ? revenueRows : otherRows;

    return (
      <div className="space-y-2">
        {/* Header */}
        <div className={cn("grid gap-2 text-xs font-medium text-muted-foreground", showAddressColumn ? "grid-cols-[1fr_1fr_80px_100px_100px_32px]" : "grid-cols-[1fr_1fr_80px_100px_32px]")}>
          <div>{type === 'revenue' ? 'Cost Code' : 'Account'}</div>
          <div>Description</div>
          <div>Qty</div>
          <div>Cost</div>
          {showAddressColumn && <div>Address</div>}
          <div></div>
        </div>

        {rows.map(row => (
          <div key={row.id} className={cn("grid gap-2 items-center", showAddressColumn ? "grid-cols-[1fr_1fr_80px_100px_100px_32px]" : "grid-cols-[1fr_1fr_80px_100px_32px]")}>
            {type === 'revenue' ? (
              <CostCodeSearchInput
                value={row.account}
                onChange={(val) => updateRow(type, row.id, 'account', val)}
                onCostCodeSelect={(cc) => {
                  updateRow(type, row.id, 'account', `${cc.code} - ${cc.name}`);
                  updateRow(type, row.id, 'costCodeId', cc.id);
                }}
                placeholder="Search cost codes..."
                className="h-8 text-xs"
              />
            ) : (
              <AccountSearchInputInline
                value={row.account}
                onChange={(val) => updateRow(type, row.id, 'account', val)}
                onAccountSelect={(acc) => {
                  updateRow(type, row.id, 'account', `${acc.code} - ${acc.name}`);
                  updateRow(type, row.id, 'accountId', acc.id);
                }}
                placeholder="Search accounts..."
                className="h-8 text-xs"
              />
            )}
            <Input
              value={row.memo}
              onChange={(e) => updateRow(type, row.id, 'memo', e.target.value)}
              placeholder="Description"
              className="h-8 text-xs"
            />
            <Input
              value={row.quantity}
              onChange={(e) => updateRow(type, row.id, 'quantity', e.target.value)}
              placeholder="1"
              className="h-8 text-xs text-right"
            />
            <Input
              value={row.amount}
              onChange={(e) => updateRow(type, row.id, 'amount', e.target.value)}
              placeholder="0.00"
              className="h-8 text-xs text-right"
            />
            {showAddressColumn && (
              <Select
                value={row.lotId || ""}
                onValueChange={(value) => updateRow(type, row.id, 'lotId', value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {lots.map(lot => (
                    <SelectItem key={lot.id} value={lot.id} className="text-xs">
                      {lot.lot_number || lot.lot_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(type, row.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <Button variant="ghost" size="sm" className="text-xs" onClick={() => addRow(type)}>
          <Plus className="h-3 w-3 mr-1" /> Add Line
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Deposit</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0 space-y-4">
            {/* Header Fields */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Date</Label>
                <DateInputPicker
                  date={depositDate}
                  onDateChange={(date) => setDepositDate(date)}
                />
              </div>
              <div>
                <Label className="text-xs">Deposit To</Label>
                <AccountSearchInputInline
                  value={bankAccount}
                  onChange={(val) => setBankAccount(val)}
                  onAccountSelect={(acc) => {
                    setBankAccountId(acc.id);
                    setBankAccount(`${acc.code} - ${acc.name}`);
                  }}
                  placeholder="Bank account..."
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Received From</Label>
                <VendorSearchInput
                  value={depositSourceId}
                  onChange={(val) => setDepositSourceId(val)}
                  onCompanySelect={(company) => {
                    setDepositSourceName(company.company_name);
                  }}
                  displayValue={depositSourceName}
                  placeholder="Vendor..."
                />
              </div>
              <div>
                <Label className="text-xs">Check #</Label>
                <Input
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Check #"
                  className="h-9"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="other">Chart of Accounts</TabsTrigger>
                <TabsTrigger value="revenue">Job Cost</TabsTrigger>
              </TabsList>
              <TabsContent value="other">
                {renderLineItems('other')}
              </TabsContent>
              <TabsContent value="revenue">
                {renderLineItems('revenue')}
              </TabsContent>
            </Tabs>

            {/* Attachments */}
            <div>
              <Label className="text-xs">Attachments</Label>
              <DepositAttachmentUpload
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                depositId={depositId}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <div className="text-sm font-semibold">
            Total: {formatCurrency(calculateTotal())}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
