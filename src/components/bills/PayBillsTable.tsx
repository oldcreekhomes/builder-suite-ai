import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayBillDialog } from "@/components/PayBillDialog";
import { BillFilesCell } from "@/components/bills/BillFilesCell";
import { DeleteButton } from "@/components/ui/delete-button";
import { MinimalCheckbox } from "@/components/ui/minimal-checkbox";
import { toast } from "@/hooks/use-toast";
import { Check, ArrowUpDown, ArrowUp, ArrowDown, X, StickyNote, Edit } from "lucide-react";
import { EditBillDialog } from "./EditBillDialog";
import { BillNotesDialog } from "./BillNotesDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { format } from "date-fns";
import { useBillPOMatching, POMatch } from "@/hooks/useBillPOMatching";
import { POStatusBadge } from "./POStatusBadge";
import { POComparisonDialog } from "./POComparisonDialog";
import { CreditUsageHistoryDialog } from "./CreditUsageHistoryDialog";

interface BillAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string;
}

interface BillForPayment {
  id: string;
  vendor_id: string;
  project_id?: string;
  bill_date: string;
  due_date: string | null;
  total_amount: number;
  amount_paid?: number;
  reference_number: string | null;
  terms: string | null;
  notes?: string;
  status: string;
  reconciled: boolean;
  companies?: {
    company_name: string;
  };
  projects?: {
    address: string;
  };
  bill_attachments?: BillAttachment[];
  bill_lines?: Array<{
    line_type: string;
    cost_code_id?: string;
    account_id?: string;
    lot_id?: string;
    amount?: number;
    project_lots?: {
      id: string;
      lot_name?: string;
      lot_number: number;
    };
    cost_codes?: {
      code: string;
      name: string;
    };
    accounts?: {
      code: string;
      name: string;
    };
  }>;
}

interface PayBillsTableProps {
  projectId?: string;
  projectIds?: string[];
  showProjectColumn?: boolean;
  searchQuery?: string;
  dueDateFilter?: "all" | "due-on-or-before";
  filterDate?: Date;
  showEditButton?: boolean;
}

export function PayBillsTable({ projectId, projectIds, showProjectColumn = true, searchQuery, dueDateFilter = "all", filterDate, showEditButton = false }: PayBillsTableProps) {
  const { payBill, payMultipleBills, deleteBill } = useBills();
  const queryClient = useQueryClient();
  const [selectedBill, setSelectedBill] = useState<BillForPayment | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'vendor' | 'bill_date' | 'due_date' | null>('bill_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { isDateLocked, latestClosedDate } = useClosedPeriodCheck(projectId);
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
  const [poDialogState, setPoDialogState] = useState<{
    open: boolean;
    poMatch: POMatch | null;
    bill: BillForPayment | null;
  }>({
    open: false,
    poMatch: null,
    bill: null,
  });
  const [creditHistoryDialog, setCreditHistoryDialog] = useState<{
    open: boolean;
    bill: BillForPayment | null;
  }>({ open: false, bill: null });
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
      queryClient.invalidateQueries({ queryKey: ['bills-for-payment'] });
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

  const handleSort = (column: 'vendor' | 'bill_date' | 'due_date') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Fetch bills that are approved and ready for payment (status = 'posted')
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills-for-payment', projectId, projectIds],
    queryFn: async () => {
      if (projectIds && projectIds.length > 0) {
        // Multiple project filtering - get bills for specific projects
        const { data: directBills, error: directError } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            amount_paid,
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
              project_lots!bill_lines_lot_id_fkey (
                id,
                lot_name,
                lot_number
              ),
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            )
          `)
          .eq('status', 'posted')
          .eq('is_reversal', false)
          .in('project_id', projectIds)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (directError) throw directError;
        return (directBills || []) as BillForPayment[];
      } else if (projectId) {
        // Project-specific bills - get bills directly assigned to project
        const { data: directBills, error: directError } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            amount_paid,
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
              project_lots!bill_lines_lot_id_fkey (
                id,
                lot_name,
                lot_number
              ),
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            )
          `)
          .eq('status', 'posted')
          .eq('is_reversal', false)
          .eq('project_id', projectId)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (directError) throw directError;

        // Get bills with line items assigned to project but bill header has no project
        const { data: indirectBills, error: indirectError } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            amount_paid,
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
            bill_lines!inner(
              project_id,
              line_type,
              cost_code_id,
              account_id,
              lot_id,
              amount,
              project_lots!bill_lines_lot_id_fkey (
                id,
                lot_name,
                lot_number
              ),
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            ),
            bill_attachments (
              id,
              file_name,
              file_path,
              file_size,
              content_type
            )
          `)
          .eq('status', 'posted')
          .eq('is_reversal', false)
          .is('project_id', null)
          .eq('bill_lines.project_id', projectId)
          .order('due_date', { ascending: true, nullsFirst: false });

        if (indirectError) throw indirectError;

        // Combine and deduplicate bills
        const allBills = [...(directBills || []), ...(indirectBills || [])];
        const uniqueBills = allBills.filter((bill, index, array) => 
          array.findIndex(b => b.id === bill.id) === index
        );

        return uniqueBills as BillForPayment[];
      } else {
        // Company-level bills - show all bills
        const { data, error } = await supabase
          .from('bills')
          .select(`
            id,
            vendor_id,
            project_id,
            bill_date,
            due_date,
            total_amount,
            amount_paid,
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
              project_lots!bill_lines_lot_id_fkey (
                id,
                lot_name,
                lot_number
              ),
              cost_codes!bill_lines_cost_code_id_fkey (
                code,
                name
              ),
              accounts!bill_lines_account_id_fkey (
                code,
                name
              )
            )
          `)
          .eq('status', 'posted')
          .order('due_date', { ascending: true, nullsFirst: false });
        
        if (error) throw error;
        return data as BillForPayment[];
      }
    },
  });

  const sortedBills = useMemo(() => {
    if (!bills || bills.length === 0) return bills;
    if (!sortColumn) return bills;

    const arr = [...bills];
    const toYMD = (d?: string) => normalizeToYMD(d || '');

    return arr.sort((a, b) => {
      let cmp = 0;

      if (sortColumn === 'vendor') {
        const aVendor = (a.companies?.company_name || '').toLowerCase();
        const bVendor = (b.companies?.company_name || '').toLowerCase();
        cmp = aVendor.localeCompare(bVendor);
      } else if (sortColumn === 'bill_date') {
        cmp = toYMD(a.bill_date).localeCompare(toYMD(b.bill_date));
      } else if (sortColumn === 'due_date') {
        const aD = a.due_date || '';
        const bD = b.due_date || '';
        if (!aD && bD) cmp = 1;
        else if (aD && !bD) cmp = -1;
        else if (!aD && !bD) cmp = 0;
        else cmp = toYMD(aD).localeCompare(toYMD(bD));
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [bills, sortColumn, sortDirection]);

  const filteredBills = useMemo(() => {
    let filtered = sortedBills;

    // Apply date filter
    if (dueDateFilter === "due-on-or-before" && filterDate && filtered) {
      const filterDateYMD = normalizeToYMD(filterDate.toISOString());
      filtered = filtered.filter(bill => {
        if (!bill.due_date) return false;
        const billDueDateYMD = normalizeToYMD(bill.due_date);
        return billDueDateYMD <= filterDateYMD;
      });
    }

    // Apply search filter
    if (searchQuery && filtered) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bill => {
        // Search by vendor name
        const vendorName = (bill.companies?.company_name || '').toLowerCase();
        if (vendorName.includes(query)) return true;

        // Search by reference number
        const refNumber = (bill.reference_number || '').toLowerCase();
        if (refNumber.includes(query)) return true;

        // Search by project address
        const projectAddress = (bill.projects?.address || '').toLowerCase();
        if (projectAddress.includes(query)) return true;

        // Search by cost codes
        if (bill.bill_lines) {
          const matchesCostCode = bill.bill_lines.some(line => {
            if (line.cost_codes) {
              const code = (line.cost_codes.code || '').toLowerCase();
              const name = (line.cost_codes.name || '').toLowerCase();
              return code.includes(query) || name.includes(query);
            }
            return false;
          });
          if (matchesCostCode) return true;
        }

        return false;
      });
    }

    return filtered;
  }, [sortedBills, searchQuery, dueDateFilter, filterDate]);

  // PO matching for bills
  const billsForMatching = useMemo(() => {
    return bills.map(b => ({
      id: b.id,
      vendor_id: b.vendor_id,
      project_id: b.project_id,
      total_amount: b.total_amount,
      bill_lines: b.bill_lines?.map(l => ({
        cost_code_id: l.cost_code_id,
        amount: l.amount,
        cost_codes: l.cost_codes
      }))
    }));
  }, [bills]);

  const { data: poMatchingData } = useBillPOMatching(billsForMatching);

  // Helper functions for selection
  const getVendorForBill = (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    return bill?.vendor_id;
  };

  const getSelectedVendor = () => {
    if (selectedBillIds.size === 0) return null;
    const firstBillId = Array.from(selectedBillIds)[0];
    return getVendorForBill(firstBillId);
  };

  const canSelectBill = (billId: string) => {
    if (selectedBillIds.size === 0) return true;
    const selectedVendor = getSelectedVendor();
    const billVendor = getVendorForBill(billId);
    return selectedVendor === billVendor;
  };

  const handleCheckboxChange = (billId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      if (!canSelectBill(billId)) {
        const selectedVendorName = bills.find(b => b.id === Array.from(selectedBillIds)[0])?.companies?.company_name || 'Unknown';
        toast({
          title: "Cannot select bill",
          description: `You can only select bills from the same vendor. Currently selected: ${selectedVendorName}`,
          variant: "destructive",
        });
        return;
      }
      setSelectedBillIds(prev => new Set([...prev, billId]));
    } else {
      setSelectedBillIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(billId);
        return newSet;
      });
    }
  };

  const handleHeaderCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      // Select all bills from first vendor or all bills from currently selected vendor
      const targetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
      if (targetVendor) {
        const sameVendorBillIds = filteredBills
          .filter(b => b.vendor_id === targetVendor)
          .map(b => b.id);
        setSelectedBillIds(new Set(sameVendorBillIds));
      }
    } else {
      setSelectedBillIds(new Set());
    }
  };

  const handlePayBill = (bill: BillForPayment) => {
    setSelectedBill(bill);
    setDialogOpen(true);
  };

  const handlePaySelectedBills = () => {
    const selectedBills = filteredBills.filter(b => selectedBillIds.has(b.id));
    if (selectedBills.length === 0) return;
    
    setSelectedBill(selectedBills.length === 1 ? selectedBills[0] : null);
    setDialogOpen(true);
  };

  const handleConfirmPayment = (billIds: string[], paymentAccountId: string, paymentDate: string, memo?: string, paymentAmount?: number) => {
    if (billIds.length === 1) {
      payBill.mutate(
        { billId: billIds[0], paymentAccountId, paymentDate, memo, paymentAmount },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setSelectedBill(null);
            setSelectedBillIds(new Set());
          }
        }
      );
    } else {
      payMultipleBills.mutate(
        { billIds, paymentAccountId, paymentDate, memo },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setSelectedBill(null);
            setSelectedBillIds(new Set());
          }
        }
      );
    }
  };

  const clearSelection = () => {
    setSelectedBillIds(new Set());
  };

  const selectedBills = useMemo(() => {
    return filteredBills.filter(b => selectedBillIds.has(b.id));
  }, [filteredBills, selectedBillIds]);

  const selectedVendorName = selectedBills.length > 0 
    ? selectedBills[0].companies?.company_name || 'Unknown Vendor'
    : '';

  const selectedTotal = selectedBills.reduce((sum, bill) => sum + (bill.total_amount - (bill.amount_paid || 0)), 0);

  const isHeaderChecked = useMemo(() => {
    if (filteredBills.length === 0) return false;
    const targetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
    const sameVendorBills = filteredBills.filter(b => b.vendor_id === targetVendor);
    return sameVendorBills.length > 0 && sameVendorBills.every(b => selectedBillIds.has(b.id));
  }, [filteredBills, selectedBillIds]);

  const isHeaderIndeterminate = useMemo(() => {
    if (filteredBills.length === 0) return false;
    const targetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
    const sameVendorBills = filteredBills.filter(b => b.vendor_id === targetVendor);
    const selectedCount = sameVendorBills.filter(b => selectedBillIds.has(b.id)).length;
    return selectedCount > 0 && selectedCount < sameVendorBills.length;
  }, [filteredBills, selectedBillIds]);

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

  const getCostCodeOrAccountData = (bill: BillForPayment) => {
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

  const getLotAllocationData = (bill: BillForPayment) => {
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


  if (isLoading) {
    return <div className="p-8 text-center">Loading bills for payment...</div>;
  }

  return (
    <>
      {/* Bulk Payment Toolbar */}
      {selectedBillIds.size > 0 && (
        <div className="mb-4 p-3 border rounded-lg bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              {selectedBillIds.size} bill{selectedBillIds.size > 1 ? 's' : ''} selected from {selectedVendorName}
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {formatCurrency(selectedTotal)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePaySelectedBills}
              disabled={payBill.isPending || payMultipleBills.isPending}
            >
              Pay Selected Bills
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearSelection}
            >
              <X className="h-4 w-4 mr-1" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-10">
                <MinimalCheckbox
                  checked={isHeaderChecked}
                  indeterminate={isHeaderIndeterminate}
                  onChange={handleHeaderCheckboxChange}
                />
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">
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
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
              {showProjectColumn && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
              )}
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">
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
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleSort('due_date')}
                  className="flex items-center gap-1 hover:text-primary"
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
              </TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-40">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Address</TableHead>
              
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-16">Files</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-16">Notes</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-20">PO Status</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12 + (showProjectColumn ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  No approved bills found for payment.
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill.id} className="h-10">
                  <TableCell className="px-2 py-1 text-xs">
                    <MinimalCheckbox
                      checked={selectedBillIds.has(bill.id)}
                      onChange={(e) => handleCheckboxChange(bill.id, e)}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap">
                    {bill.companies?.company_name || 'Unknown Vendor'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap">
                    {(() => {
                      const { display, costCodeBreakdown, totalAmount, count } = getCostCodeOrAccountData(bill);
                      if (count <= 1) {
                        return display;
                      }
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="cursor-default">
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
                  {showProjectColumn && (
                    <TableCell className="px-2 py-1 text-xs">
                      {bill.projects?.address || '-'}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1 text-xs">
                    {formatDisplayFromAny(bill.bill_date)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
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
                  <TableCell className="px-2 py-1 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      {formatCurrency(
                        bill.total_amount < 0
                          ? bill.total_amount + (bill.amount_paid || 0)
                          : bill.total_amount - (bill.amount_paid || 0)
                      )}
                      {bill.total_amount < 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Credit
                        </Badge>
                      )}
                      {bill.total_amount < 0 && (bill.amount_paid || 0) > 0 && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCreditHistoryDialog({ open: true, bill });
                          }}
                        >
                          (${Math.abs(bill.amount_paid || 0).toFixed(2)} used)
                        </button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap">
                    {bill.reference_number || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
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
                  
                  <TableCell className="px-2 py-1 text-xs">
                    <BillFilesCell attachments={bill.bill_attachments || []} />
                  </TableCell>
                  <TableCell className="px-2 py-1 text-center">
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
                  {/* PO Status column */}
                  <TableCell className="px-2 py-1 w-20 text-center">
                    {(() => {
                      const matchResult = poMatchingData?.get(bill.id);
                      const status = matchResult?.overall_status || 'no_po';
                      const firstMatch = matchResult?.matches?.[0] || null;
                      
                      return (
                        <POStatusBadge
                          status={status}
                          onClick={() => {
                            if (firstMatch) {
                              setPoDialogState({
                                open: true,
                                poMatch: firstMatch,
                                bill: bill
                              });
                            }
                          }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    <div className="flex items-center gap-2">
                      {showEditButton && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted"
                          onClick={() => setEditingBillId(bill.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handlePayBill(bill)}
                        disabled={payBill.isPending}
                        className="h-7 text-xs px-3"
                      >
                        {payBill.isPending ? "Processing..." : "Pay Bill"}
                      </Button>
                      {!isDateLocked(bill.bill_date) ? (
                        <DeleteButton
                          onDelete={() => deleteBill.mutate(bill.id)}
                          title="Delete Bill"
                          description={`Are you sure you want to delete this bill from ${bill.companies?.company_name || 'Unknown Vendor'} for ${formatCurrency(bill.total_amount)}? This action cannot be undone.`}
                          size="icon"
                          variant="ghost"
                          isLoading={deleteBill.isPending}
                        />
                      ) : (
                        <div
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md"
                          aria-label="Bill is in a closed accounting period"
                        >
                          <span className="text-lg">🔒</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {filteredBills.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Total bills: {filteredBills.length}</p>
          <p>Total amount: {formatCurrency(filteredBills.reduce((sum, bill) => sum + bill.total_amount, 0))}</p>
        </div>
      )}

      <PayBillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bills={selectedBill ? selectedBill : selectedBills}
        onConfirm={handleConfirmPayment}
        isLoading={payBill.isPending || payMultipleBills.isPending}
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
        onOpenChange={(open) => !open && setEditingBillId(null)}
        billId={editingBillId || ''}
      />

      <POComparisonDialog
        open={poDialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            setPoDialogState({ open: false, poMatch: null, bill: null });
          }
        }}
        poMatch={poDialogState.poMatch}
        projectId={poDialogState.bill?.project_id || null}
        vendorId={poDialogState.bill?.vendor_id || null}
        currentBillAmount={poDialogState.bill?.total_amount}
        currentBillReference={poDialogState.bill?.reference_number || undefined}
      />

      <CreditUsageHistoryDialog
        open={creditHistoryDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setCreditHistoryDialog({ open: false, bill: null });
          }
        }}
        credit={creditHistoryDialog.bill}
      />
    </>
  );
}
