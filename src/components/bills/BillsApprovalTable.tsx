import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { useUserRole } from "@/hooks/useUserRole";
import { BillFilesCell } from "./BillFilesCell";
import { DeleteButton } from "@/components/ui/delete-button";
import { PayBillDialog } from "@/components/PayBillDialog";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";
import { ArrowUpDown, ArrowUp, ArrowDown, StickyNote, Edit, Check } from 'lucide-react';
import { EditBillDialog } from './EditBillDialog';
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { BillNotesDialog } from './BillNotesDialog';
import { toast } from "@/hooks/use-toast";

interface BillForApproval {
  id: string;
  vendor_id: string;
  project_id?: string;
  bill_date: string;
  due_date?: string;
  total_amount: number;
  reference_number?: string;
  terms?: string;
  notes?: string;
  status: string;
  reconciled: boolean;
  companies?: {
    company_name: string;
  };
  projects?: {
    address: string;
  };
  bill_attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    content_type: string;
  }>;
  bill_lines?: Array<{
    line_type: string;
    cost_code_id?: string;
    account_id?: string;
    lot_id?: string;
    amount?: number;
    memo?: string;
    cost_codes?: {
      code: string;
      name: string;
    };
    accounts?: {
      code: string;
      name: string;
    };
    project_lots?: {
      id: string;
      lot_name?: string;
      lot_number: number;
    };
  }>;
}

interface BillsApprovalTableProps {
  status: 'draft' | 'void' | 'posted' | 'paid' | Array<'draft' | 'void' | 'posted' | 'paid'>;
  projectId?: string;
  projectIds?: string[];
  showProjectColumn?: boolean;
  defaultSortBy?: 'bill_date' | 'due_date';
  sortOrder?: 'asc' | 'desc';
  enableSorting?: boolean;
  showPayBillButton?: boolean;
  searchQuery?: string;
  showEditButton?: boolean;
}

export function BillsApprovalTable({ status, projectId, projectIds, showProjectColumn = true, defaultSortBy, sortOrder, enableSorting = false, showPayBillButton = false, searchQuery, showEditButton = false }: BillsApprovalTableProps) {
  const { approveBill, rejectBill, deleteBill, payBill } = useBills();
  const { canDeleteBills, isOwner } = useUserRole();
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);
  const queryClient = useQueryClient();
  const [sortColumn, setSortColumn] = useState<'project' | 'due_date' | 'vendor' | 'bill_date' | null>(
    defaultSortBy === 'due_date' ? 'due_date' : 'bill_date'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(sortOrder || 'asc');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    billId: string;
    billInfo?: BillForApproval;
    notes: string;
  }>({
    open: false,
    action: '',
    billId: '',
    billInfo: undefined,
    notes: '',
  });
  const [payBillDialogOpen, setPayBillDialogOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<BillForApproval | null>(null);
  const [notesDialog, setNotesDialog] = useState<{
    open: boolean;
    billId: string;
    billInfo?: {
      vendor: string;
      amount: number;
    };
    initialNotes: string;
  }>({
    open: false,
    billId: '',
    billInfo: undefined,
    initialNotes: '',
  });
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [actionValue, setActionValue] = useState<Record<string, string>>({});

  const updateNotesMutation = useMutation({
    mutationFn: async ({ billId, newNote, existingNotes }: { billId: string; newNote: string; existingNotes: string }) => {
      // Get user profile for attribution
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();
      
      const userName = userData 
        ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() 
        : 'Unknown User';
      
      // Format the new note with attribution, date, and append to existing
      let finalNotes = existingNotes;
      if (newNote.trim()) {
        const { formatBillNote, appendBillNote } = await import('@/lib/billNoteUtils');
        const attributedNote = formatBillNote(userName, newNote.trim());
        finalNotes = appendBillNote(existingNotes, attributedNote);
      }
      
      const { error } = await supabase
        .from('bills')
        .update({ notes: finalNotes })
        .eq('id', billId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills-for-approval-v3'] });
      toast({
        title: "Notes updated",
        description: "Bill notes have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notes.",
        variant: "destructive",
      });
    },
  });

  const handleSaveNotes = (newNote: string) => {
    updateNotesMutation.mutate({ 
      billId: notesDialog.billId, 
      newNote, 
      existingNotes: notesDialog.initialNotes 
    });
  };

  const handleSort = (column: 'project' | 'due_date' | 'vendor' | 'bill_date') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Fetch bills based on status
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-approval-v3', status, projectId, projectIds],
    queryFn: async () => {
      const statusArray = Array.isArray(status) ? status : [status];
      
      // Get all bills matching the status
      let directQuery = supabase
        .from('bills')
        .select(`
          id,
          vendor_id,
          project_id,
          bill_date,
          due_date,
          total_amount,
          reference_number,
          terms,
          notes,
          status,
          reconciled,
          companies:vendor_id (
            company_name
          ),
          projects:project_id (
            address
          ),
          bill_attachments (
            id,
            file_name,
            file_path,
            file_size,
            content_type
          ),
          bill_lines (
            line_type,
            cost_code_id,
            account_id,
            lot_id,
            amount,
            memo,
            cost_codes!bill_lines_cost_code_id_fkey (
              code,
              name
            ),
            accounts!bill_lines_account_id_fkey (
              code,
              name
            ),
            project_lots!bill_lines_lot_id_fkey (
              id,
              lot_name,
              lot_number
            )
          )
        `)
        .in('status', statusArray)
        .eq('is_reversal', false)
        .is('reversed_at', null);

      // Filter by project_id or projectIds if provided
      if (projectIds && projectIds.length > 0) {
        directQuery = directQuery.in('project_id', projectIds);
      } else if (projectId) {
        directQuery = directQuery.eq('project_id', projectId);
      }

      const { data: directBills, error: directError } = await directQuery;

      if (directError) throw directError;

      // Return all bills
      const allBills = directBills || [];
      
      return allBills as BillForApproval[];
    },
  });

  const sortedBills = useMemo(() => {
    const arr = [...bills];
    if (arr.length === 0) return arr;

    const activeColumn: 'project' | 'due_date' | 'bill_date' | 'vendor' =
      enableSorting && sortColumn ? sortColumn : (defaultSortBy === 'due_date' ? 'due_date' : 'bill_date');

    const activeDirection: 'asc' | 'desc' =
      enableSorting && sortColumn ? sortDirection : (sortOrder || (defaultSortBy === 'due_date' ? 'asc' : 'desc'));

    const toYMD = (d?: string) => normalizeToYMD(d || '');

    return arr.sort((a, b) => {
      let cmp = 0;

      if (activeColumn === 'project') {
        const aAddr = (a.projects?.address || '').toLowerCase();
        const bAddr = (b.projects?.address || '').toLowerCase();
        cmp = aAddr.localeCompare(bAddr);
      } else if (activeColumn === 'vendor') {
        const aVendor = (a.companies?.company_name || '').toLowerCase();
        const bVendor = (b.companies?.company_name || '').toLowerCase();
        cmp = aVendor.localeCompare(bVendor);
      } else if (activeColumn === 'due_date') {
        const aD = a.due_date || '';
        const bD = b.due_date || '';
        if (!aD && bD) cmp = 1;
        else if (aD && !bD) cmp = -1;
        else if (!aD && !bD) cmp = 0;
        else cmp = toYMD(aD).localeCompare(toYMD(bD));
      } else {
        cmp = toYMD(a.bill_date).localeCompare(toYMD(b.bill_date));
      }

      return activeDirection === 'asc' ? cmp : -cmp;
    });
  }, [bills, enableSorting, sortColumn, sortDirection, defaultSortBy, sortOrder]);

  const filteredBills = useMemo(() => {
    if (!searchQuery?.trim()) return sortedBills;
    
    const query = searchQuery.toLowerCase();
    return sortedBills.filter(bill => {
      // Check project address
      if (bill.projects?.address?.toLowerCase().includes(query)) return true;
      
      // Check vendor name
      if (bill.companies?.company_name?.toLowerCase().includes(query)) return true;
      
      // Check reference number
      if (bill.reference_number?.toLowerCase().includes(query)) return true;
      
      // Check cost codes in bill lines
      if (bill.bill_lines?.some(line => 
        line.cost_codes?.name?.toLowerCase().includes(query) ||
        line.cost_codes?.code?.toLowerCase().includes(query)
      )) return true;
      
      return false;
    });
  }, [sortedBills, searchQuery]);

  const handleActionChange = (billId: string, action: string) => {
    if (action === 'edit') {
      setEditingBillId(billId);
      return;
    }
    
    const bill = bills.find(b => b.id === billId);
    setConfirmDialog({
      open: true,
      action,
      billId,
      billInfo: bill,
      notes: '',
    });
  };

  const handleConfirmedAction = () => {
    if (confirmDialog.action === 'approve') {
      approveBill.mutate({ 
        billId: confirmDialog.billId,
        notes: confirmDialog.notes 
      });
    } else if (confirmDialog.action === 'reject') {
      rejectBill.mutate({ 
        billId: confirmDialog.billId,
        notes: confirmDialog.notes 
      });
    }
    setConfirmDialog({ open: false, action: '', billId: '', billInfo: undefined, notes: '' });
  };

  const handleCancelAction = () => {
    setConfirmDialog({ open: false, action: '', billId: '', billInfo: undefined, notes: '' });
  };

  const handlePayBill = (bill: BillForApproval) => {
    setSelectedBillForPayment(bill);
    setPayBillDialogOpen(true);
  };

  const handleConfirmPayment = (billIds: string[], paymentAccountId: string, paymentDate: string, memo?: string) => {
    payBill.mutate(
      { billId: billIds[0], paymentAccountId, paymentDate, memo },
      {
        onSuccess: () => {
          setPayBillDialogOpen(false);
          setSelectedBillForPayment(null);
        }
      }
    );
  };

  const formatCurrency = (amount: number) => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(absAmount);
    
    if (amount < 0) {
      return <span className="text-green-600 font-medium">({formatted})</span>;
    }
    return formatted;
  };

  const formatTerms = (terms: string | null | undefined) => {
    if (!terms) return '-';
    
    const termMap: Record<string, string> = {
      'due-on-receipt': 'On Receipt',
      'net-15': 'Net 15',
      'net-30': 'Net 30',
      'net-60': 'Net 60',
      'net-90': 'Net 90',
    };
    
    return termMap[terms.toLowerCase()] || terms;
  };

  const getCostCodeOrAccountData = (bill: BillForApproval) => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) {
      return { display: '-', costCodeBreakdown: [] as { costCode: string; lots: { name: string; amount: number }[] }[], totalAmount: bill.total_amount, count: 0 };
    }
    
    // Group by cost code, then by lot
    const costCodeMap = new Map<string, Map<string, { name: string; amount: number }>>();
    
    bill.bill_lines.forEach(line => {
      const costCodeKey = line.cost_codes 
        ? `${line.cost_codes.code}: ${line.cost_codes.name}`
        : line.accounts 
          ? `${line.accounts.code}: ${line.accounts.name}`
          : null;
      
      if (!costCodeKey) return;
      
      const lotName = line.project_lots?.lot_name || 
        (line.project_lots ? `Lot ${line.project_lots.lot_number}` : 'Unassigned');
      const lotKey = line.lot_id || 'unassigned';
      
      if (!costCodeMap.has(costCodeKey)) {
        costCodeMap.set(costCodeKey, new Map());
      }
      
      const lotMap = costCodeMap.get(costCodeKey)!;
      const existing = lotMap.get(lotKey);
      if (existing) {
        existing.amount += line.amount || 0;
      } else {
        lotMap.set(lotKey, { name: lotName, amount: line.amount || 0 });
      }
    });
    
    const costCodeBreakdown = Array.from(costCodeMap.entries()).map(([costCode, lotMap]) => ({
      costCode,
      lots: Array.from(lotMap.values())
    }));
    
    const count = costCodeBreakdown.length;
    // Use bill.total_amount as the authoritative total to avoid rounding errors
    if (count === 0) return { display: '-', costCodeBreakdown: [], totalAmount: bill.total_amount, count: 0 };
    if (count === 1) return { display: costCodeBreakdown[0].costCode, costCodeBreakdown, totalAmount: bill.total_amount, count: 1 };
    return { display: `${costCodeBreakdown[0].costCode} +${count - 1}`, costCodeBreakdown, totalAmount: bill.total_amount, count };
  };

  const getLotAllocationData = (bill: BillForApproval) => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) {
      return { display: '-', costCodeBreakdown: [] as { costCode: string; lots: { name: string; amount: number }[] }[], totalAmount: bill.total_amount, uniqueLotCount: 0 };
    }
    
    // Group by cost code, then by lot
    const costCodeMap = new Map<string, Map<string, { name: string; amount: number }>>();
    const uniqueLots = new Set<string>();
    
    bill.bill_lines.forEach(line => {
      if (line.project_lots && line.lot_id) {
        const costCodeKey = line.cost_codes 
          ? `${line.cost_codes.code}: ${line.cost_codes.name}`
          : line.accounts 
            ? `${line.accounts.code}: ${line.accounts.name}`
            : 'Unknown';
        
        const lotKey = line.lot_id;
        const lotName = line.project_lots.lot_name || `Lot ${line.project_lots.lot_number}`;
        uniqueLots.add(lotKey);
        
        if (!costCodeMap.has(costCodeKey)) {
          costCodeMap.set(costCodeKey, new Map());
        }
        
        const lotMap = costCodeMap.get(costCodeKey)!;
        const existing = lotMap.get(lotKey);
        if (existing) {
          existing.amount += line.amount || 0;
        } else {
          lotMap.set(lotKey, { name: lotName, amount: line.amount || 0 });
        }
      }
    });
    
    const costCodeBreakdown = Array.from(costCodeMap.entries()).map(([costCode, lotMap]) => ({
      costCode,
      lots: Array.from(lotMap.values())
    }));
    
    const uniqueLotCount = uniqueLots.size;
    
    // Use bill.total_amount as the authoritative total to avoid rounding errors
    if (uniqueLotCount === 0) return { display: '-', costCodeBreakdown: [], totalAmount: bill.total_amount, uniqueLotCount: 0 };
    if (uniqueLotCount === 1 && costCodeBreakdown.length > 0) {
      return { display: costCodeBreakdown[0].lots[0]?.name || '-', costCodeBreakdown, totalAmount: bill.total_amount, uniqueLotCount: 1 };
    }
    
    return { display: `+${uniqueLotCount}`, costCodeBreakdown, totalAmount: bill.total_amount, uniqueLotCount };
  };

  // Helper to get bill memo summary from bill_lines
  const getBillMemoSummary = (bill: BillForApproval): string | null => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) return null;
    
    const memos = bill.bill_lines
      .map(line => line.memo?.trim())
      .filter((memo): memo is string => !!memo);
    
    if (memos.length === 0) return null;
    
    // Deduplicate memos
    const uniqueMemos = [...new Set(memos)];
    return uniqueMemos.join(' • ');
  };

  const isDraftStatus = status === 'draft';
  const isPaidOrPostedStatus = status === 'paid' || status === 'posted' || 
    (Array.isArray(status) && (status.includes('paid') || status.includes('posted')));
  
  const canShowDeleteButton = 
    // For rejected bills (void status), owners and accountants can edit
    ((isOwner || canDeleteBills) && (status === 'void' || (Array.isArray(status) && status.includes('void')))) ||
    // For posted/paid bills, owners and accountants can delete
    (canDeleteBills && (status === 'posted' || status === 'paid' || (Array.isArray(status) && (status.includes('posted') || status.includes('paid')))));

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills...</div>;
  }

  // Calculate total columns for colSpan (fixed column count for consistent layout)
  // Base: Vendor(1) + CostCode(1) + BillDate(1) + DueDate(1) + Amount(1) + Reference(1) + Memo(1) + Address(1) + Terms(1) + Files(1) + Notes(1) + FinalColumn(1) = 12
  // + Project(1) if shown = 13
  // + PayBill(1) if shown
  // + Delete(1) if shown
  const baseColCount = 12 + (showProjectColumn ? 1 : 0) + (showPayBillButton ? 1 : 0) + (canShowDeleteButton ? 1 : 0);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Scrollable table container */}
        <div className="border rounded-lg overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1 min-h-0">
            <Table containerClassName="relative w-full" className="table-fixed">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="h-8">
                  {showProjectColumn && (
                    <TableHead className="h-8 px-2 py-1 text-xs font-medium w-44">
                      {enableSorting ? (
                        <button
                          type="button"
                          onClick={() => handleSort('project')}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <span>Project</span>
                          {sortColumn === 'project' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        'Project'
                      )}
                    </TableHead>
                  )}
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-36">
                    {enableSorting ? (
                      <button
                        type="button"
                        onClick={() => handleSort('vendor')}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <span>Vendor</span>
                        {sortColumn === 'vendor' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      'Vendor'
                    )}
                  </TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-44">Cost Code</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">
                    {enableSorting ? (
                      <button
                        type="button"
                        onClick={() => handleSort('bill_date')}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <span>Bill Date</span>
                        {sortColumn === 'bill_date' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      'Bill Date'
                    )}
                  </TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">
                    {enableSorting ? (
                      <button
                        type="button"
                        onClick={() => handleSort('due_date')}
                        className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
                      >
                        <span>Due Date</span>
                        {sortColumn === 'due_date' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    ) : (
                      <span className="whitespace-nowrap">Due Date</span>
                    )}
                  </TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Amount</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-32">Reference</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-12 text-center">Memo</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Address</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-20">Terms</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-14 text-center">Files</TableHead>
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-14 text-center">Notes</TableHead>
                  {/* Final column: Actions for draft, Cleared for posted/paid - always renders for consistent layout */}
                  <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24 text-center">
                    {isDraftStatus ? 'Actions' : 'Cleared'}
                  </TableHead>
                  {showPayBillButton && (
                    <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-24">Pay Bill</TableHead>
                  )}
                  {canShowDeleteButton && (
                    <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-16">
                      {showEditButton ? 'Edit' : 'Delete'}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={baseColCount} className="text-center py-8 text-muted-foreground">
                  No bills found for this status.
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => {
                const memoSummary = getBillMemoSummary(bill);
                return (
                <TableRow key={bill.id} className="h-10">
                  {showProjectColumn && (
                    <TableCell className="px-2 py-1 text-xs w-44">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">
                              {bill.projects?.address || '-'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{bill.projects?.address || '-'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1 text-xs w-36">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate">
                            {bill.companies?.company_name || 'Unknown Vendor'}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{bill.companies?.company_name || 'Unknown Vendor'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap w-44">
                    {(() => {
                      const { display, costCodeBreakdown, totalAmount, count } = getCostCodeOrAccountData(bill);
                      if (count <= 1) {
                        return <span className="block truncate">{display}</span>;
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="cursor-default block truncate">
                              {display}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-2">
                                {costCodeBreakdown.map((cc, i) => (
                                  <div key={i}>
                                    <div className="font-medium text-xs">{cc.costCode}</div>
                                    <div className="pl-2 space-y-0.5">
                                      {cc.lots.map((lot, j) => (
                                        <div key={j} className="flex justify-between gap-4 text-xs">
                                          <span className="text-muted-foreground">{lot.name}:</span>
                                          <span>${lot.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
                                  <span>Total:</span>
                                  <span>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs w-24">
                    {formatDisplayFromAny(bill.bill_date)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs w-24">
                    {bill.due_date ? (
                      (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = new Date(bill.due_date);
                        dueDate.setHours(0, 0, 0, 0);
                        const isOverdue = dueDate < today;
                        
                        return (
                          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                            {formatDisplayFromAny(bill.due_date)}
                          </span>
                        );
                      })()
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs w-24">
                    <div className="flex items-center gap-1">
                      {formatCurrency(bill.total_amount)}
                      {bill.total_amount < 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] px-1">
                          CR
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs w-32">
                    <span className="block truncate">{bill.reference_number || '-'}</span>
                  </TableCell>
                  {/* Memo column */}
                  <TableCell className="px-2 py-1 text-xs w-12 text-center">
                    {memoSummary ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <StickyNote className="h-3.5 w-3.5 text-muted-foreground mx-auto cursor-default" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="whitespace-pre-wrap">{memoSummary}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs w-24">
                    {(() => {
                      const { display, costCodeBreakdown, totalAmount, uniqueLotCount } = getLotAllocationData(bill);
                      if (uniqueLotCount <= 1) {
                        return display;
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {display}
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-2">
                                {costCodeBreakdown.map((cc, i) => (
                                  <div key={i}>
                                    <div className="font-medium text-xs">{cc.costCode}</div>
                                    <div className="pl-2 space-y-0.5">
                                      {cc.lots.map((lot, j) => (
                                        <div key={j} className="flex justify-between gap-4 text-xs">
                                          <span className="text-muted-foreground">{lot.name}:</span>
                                          <span>${lot.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                                <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
                                  <span>Total:</span>
                                  <span>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs w-20">
                    {formatTerms(bill.terms)}
                  </TableCell>
                  <TableCell className="px-2 py-1 w-14 text-center">
                    <BillFilesCell attachments={bill.bill_attachments || []} />
                  </TableCell>
                  <TableCell className="px-2 py-1 w-14 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-muted"
                            onClick={() => setNotesDialog({ 
                              open: true, 
                              billId: bill.id,
                              billInfo: {
                                vendor: bill.companies?.company_name || 'Unknown Vendor',
                                amount: bill.total_amount
                              },
                              initialNotes: bill.notes || ''
                            })}
                          >
                            {bill.notes?.trim() ? (
                              <StickyNote className="h-3.5 w-3.5 text-yellow-600" />
                            ) : (
                              <span className="text-xs text-muted-foreground">Add</span>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{bill.notes?.trim() ? 'View/Edit Notes' : 'Add Notes'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  {/* Final column: Actions for draft, Cleared for posted/paid */}
                  <TableCell className="px-2 py-1 w-24 text-center">
                    {isDraftStatus ? (
                      <div className="flex justify-center">
                        <Select
                          value={actionValue[bill.id] || ''}
                          onValueChange={(value) => {
                            setActionValue(prev => ({ ...prev, [bill.id]: value }));
                            handleActionChange(bill.id, value);
                          }}
                          disabled={approveBill.isPending || rejectBill.isPending}
                        >
                          <SelectTrigger className="h-7 w-20 text-xs border-gray-200 bg-white hover:bg-gray-50">
                            <SelectValue placeholder="Actions" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                            <SelectItem value="approve" className="text-xs hover:bg-gray-100 bg-white">Approve</SelectItem>
                            <SelectItem value="edit" className="text-xs hover:bg-gray-100 bg-white">Edit</SelectItem>
                            <SelectItem value="reject" className="text-xs hover:bg-gray-100 bg-white">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      bill.reconciled ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {showPayBillButton && (
                    <TableCell className="py-1 text-xs text-center w-24">
                      <Button
                        size="sm"
                        onClick={() => handlePayBill(bill)}
                        disabled={payBill.isPending}
                        className="h-7 text-xs px-2"
                      >
                        {payBill.isPending ? "..." : "Pay Bill"}
                      </Button>
                    </TableCell>
                  )}
                  {canShowDeleteButton && (
                    <TableCell className="py-1 text-center w-16">
                      <div className="flex items-center justify-center gap-1">
                        {isPaidOrPostedStatus && bill.reconciled ? (
                          <span className="text-lg">🔒</span>
                        ) : !bill.reconciled && (
                          <>
                            {showEditButton && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-muted"
                                onClick={() => setEditingBillId(bill.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {!isDateLocked(bill.bill_date) ? (
                              <DeleteButton
                                onDelete={() => deleteBill.mutate(bill.id)}
                                title="Delete Bill"
                                description={`Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This will also delete all associated journal entries and attachments.`}
                                size="icon"
                                variant="ghost"
                                isLoading={deleteBill.isPending}
                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                              />
                            ) : (
                              <span className="text-lg">🔒</span>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
            )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer - always visible, never scrolls */}
        {filteredBills.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground shrink-0">
            <p>Total bills: {filteredBills.length}</p>
            <p>Total amount: {formatCurrency(filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0))}</p>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCancelAction()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'approve' ? 'Confirm Bill Approval' : 'Confirm Bill Rejection'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog.action} this bill from{' '}
              <strong>{confirmDialog.billInfo?.companies?.company_name}</strong> for{' '}
              <strong>{formatCurrency(confirmDialog.billInfo?.total_amount || 0)}</strong>?
              {confirmDialog.action === 'reject' && ' This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-4">
            <label htmlFor="approval-notes" className="text-sm font-medium">
              {confirmDialog.action === 'approve' 
                ? 'Approval Notes (Optional)' 
                : <>Rejection Notes <span className="text-destructive">*</span></>
              }
            </label>
            <Textarea
              id="approval-notes"
              placeholder={confirmDialog.action === 'approve' 
                ? "Add any notes about this approval..." 
                : "Add reason for rejection..."
              }
              value={confirmDialog.notes}
              onChange={(e) => setConfirmDialog(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="resize-none"
            />
            {confirmDialog.action === 'reject' && (
              <p className="text-xs text-muted-foreground">
                This note will be visible to the accountant to help them understand the rejection.
              </p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedAction}
              disabled={confirmDialog.action === 'reject' && !confirmDialog.notes?.trim()}
              className={confirmDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {confirmDialog.action === 'approve' ? 'Approve Bill' : 'Reject Bill'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PayBillDialog
        open={payBillDialogOpen}
        onOpenChange={setPayBillDialogOpen}
        bills={selectedBillForPayment}
        onConfirm={handleConfirmPayment}
        isLoading={payBill.isPending}
      />

      <BillNotesDialog
        open={notesDialog.open}
        onOpenChange={(open) => !open && setNotesDialog({ 
          open: false, 
          billId: '', 
          billInfo: undefined, 
          initialNotes: '' 
        })}
        billInfo={notesDialog.billInfo || { vendor: '', amount: 0 }}
        initialValue={notesDialog.initialNotes}
        onSave={handleSaveNotes}
      />

      <EditBillDialog
        open={editingBillId !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (editingBillId) {
              setActionValue(prev => ({ ...prev, [editingBillId]: '' }));
            }
            setEditingBillId(null);
          }
        }}
        billId={editingBillId || ''}
      />
    </>
  );
}