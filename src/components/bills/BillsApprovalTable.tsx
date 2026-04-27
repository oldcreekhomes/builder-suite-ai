import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useLots } from "@/hooks/useLots";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, ChevronRight, ChevronDown } from 'lucide-react';
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
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { useUserRole } from "@/hooks/useUserRole";
import { useAccountingPermissions } from "@/hooks/useAccountingPermissions";
import { BillFilesCell } from "./BillFilesCell";
import { DeleteButton } from "@/components/ui/delete-button";
import { PayBillDialog } from "@/components/PayBillDialog";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";
import { ArrowUpDown, ArrowUp, ArrowDown, StickyNote, Edit, Check, FileText, X } from 'lucide-react';
import { EditBillDialog } from './EditBillDialog';
import { useClosedPeriodCheck } from "@/hooks/useClosedPeriodCheck";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { BillNotesDialog } from './BillNotesDialog';
import { toast } from "@/hooks/use-toast";
import { useBillPOMatching, POMatch } from "@/hooks/useBillPOMatching";
import { POStatusBadge } from "./POStatusBadge";
import { BillPOSummaryDialog } from "./BillPOSummaryDialog";
import { CreditUsageHistoryDialog } from "./CreditUsageHistoryDialog";
import { MinimalCheckbox } from "@/components/ui/minimal-checkbox";
import { getBillCostCodeDisplay } from "@/lib/billListDisplay";

interface BillForApproval {
  id: string;
  vendor_id: string;
  project_id?: string;
  bill_date: string;
  due_date?: string;
  total_amount: number;
  amount_paid?: number;
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
    purchase_order_id?: string;
    purchase_order_line_id?: string;
    po_reference?: string | null;
    po_assignment?: string | null;
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
  /** Enable multi-select + batch payment toolbar (Approved tab only). */
  enableBatchPayment?: boolean;
  /** Filter rows by due date <= filterDate when set to "due-on-or-before". */
  dueDateFilter?: "all" | "due-on-or-before";
  filterDate?: Date;
}

export function BillsApprovalTable({ status, projectId, projectIds, showProjectColumn = true, defaultSortBy, sortOrder, enableSorting = false, showPayBillButton = false, searchQuery, showEditButton = false, enableBatchPayment = false, dueDateFilter = "all", filterDate }: BillsApprovalTableProps) {
  const { lots } = useLots(projectId);
  const showAddressColumn = lots.length > 1;
  const { approveBill, rejectBill, deleteBill, payBill, payMultipleBills } = useBills();
  const { isOwner } = useUserRole();
  const { canDeleteBills } = useAccountingPermissions();
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
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  
  const [poDialogState, setPoDialogState] = useState<{
    open: boolean;
    matches: POMatch[];
    bill: BillForApproval | null;
  }>({
    open: false,
    matches: [],
    bill: null,
  });
  // Batch payment selection (Approved tab only). Keeps state regardless of
  // enableBatchPayment so the column structure stays stable across tabs.
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [batchPayDialogOpen, setBatchPayDialogOpen] = useState(false);
  // Credit usage history dialog (clickable CR badge).
  const [creditHistoryDialog, setCreditHistoryDialog] = useState<{
    open: boolean;
    bill: BillForApproval | null;
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
      const includesPosted = statusArray.includes('posted');

      const BILL_SELECT = `
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
            memo,
            po_reference,
            po_assignment,
            purchase_order_id,
            purchase_order_line_id,
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
        `;

      // Get all bills matching the status
      let directQuery = supabase
        .from('bills')
        .select(BILL_SELECT)
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

      // For Approved (posted) bills scoped to a single project, also pick up
      // bills whose header has no project_id but whose bill_lines reference
      // the project (parity with the legacy PayBillsTable behavior).
      let indirectBills: any[] = [];
      if (includesPosted && projectId && (!projectIds || projectIds.length === 0)) {
        const indirectSelect = `
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
            memo,
            po_reference,
            po_assignment,
            purchase_order_id,
            purchase_order_line_id,
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
        `;
        const { data: indirect, error: indirectError } = await supabase
          .from('bills')
          .select(indirectSelect)
          .eq('status', 'posted')
          .eq('is_reversal', false)
          .is('reversed_at', null)
          .is('project_id', null)
          .eq('bill_lines.project_id', projectId);
        if (indirectError) throw indirectError;
        indirectBills = indirect || [];
      }

      // Merge + dedupe by id
      const merged = [...(directBills || []), ...indirectBills];
      const seen = new Set<string>();
      const allBills = merged.filter((b: any) => {
        if (seen.has(b.id)) return false;
        seen.add(b.id);
        return true;
      });

      return allBills as BillForApproval[];
    },
  });

  // Fetch payment breakdown data for paid bills
  const isPaidStatus = status === 'paid' || (Array.isArray(status) && status.includes('paid'));
  const paidBillIds = useMemo(() => {
    if (!isPaidStatus) return [];
    return bills.filter(b => b.status === 'paid' && b.total_amount >= 0).map(b => b.id);
  }, [bills, isPaidStatus]);

  // Fetch consolidated payment groups for the Paid tab
  const { data: paymentGroups } = useQuery({
    queryKey: ['paid-bill-payment-groups', paidBillIds],
    queryFn: async () => {
      if (paidBillIds.length === 0) return { breakdowns: new Map<string, { cashPaid: number; credits: { ref: string; amount: number }[] }>(), groups: new Map<string, { paymentId: string; paymentDate: string; totalAmount: number; memo: string | null; billIds: string[]; allocations: { billId: string; amount: number; ref: string | null; billTotal: number; isCredit: boolean }[] }>() };

      // Get allocations for these bills
      const { data: allocations, error: allocError } = await supabase
        .from('bill_payment_allocations')
        .select('bill_id, bill_payment_id, amount_allocated')
        .in('bill_id', paidBillIds);

      if (allocError) throw allocError;
      if (!allocations || allocations.length === 0) return { breakdowns: new Map(), groups: new Map() };

      // Get unique payment IDs
      const paymentIds = [...new Set(allocations.map(a => a.bill_payment_id))];

      // Get bill_payments details
      const { data: payments, error: payError } = await supabase
        .from('bill_payments')
        .select('id, total_amount, payment_date, memo')
        .in('id', paymentIds);

      if (payError) throw payError;

      // Get ALL sibling allocations for these payments (including credits)
      const { data: siblingAllocations, error: sibError } = await supabase
        .from('bill_payment_allocations')
        .select(`
          bill_payment_id,
          bill_id,
          amount_allocated,
          bill:bills!bill_payment_allocations_bill_id_fkey(id, total_amount, reference_number, amount_paid)
        `)
        .in('bill_payment_id', paymentIds);

      if (sibError) throw sibError;

      const paymentsMap = new Map((payments || []).map(p => [p.id, p]));

      // Build breakdown per bill (for the Amount column tooltip)
      const breakdowns = new Map<string, { cashPaid: number; credits: { ref: string; amount: number }[] }>();

      for (const billId of paidBillIds) {
        const billAllocations = allocations.filter(a => a.bill_id === billId);
        const credits: { ref: string; amount: number }[] = [];

        for (const alloc of billAllocations) {
          const payment = paymentsMap.get(alloc.bill_payment_id);
          if (!payment) continue;

          const siblings = (siblingAllocations || []).filter(
            s => s.bill_payment_id === alloc.bill_payment_id && s.bill_id !== billId
          );

          const allPositiveAllocations = (siblingAllocations || []).filter(
            s => s.bill_payment_id === alloc.bill_payment_id && s.amount_allocated > 0
          );
          const totalPositive = allPositiveAllocations.reduce((sum, s) => sum + s.amount_allocated, 0);
          const myAllocation = alloc.amount_allocated;

          for (const sib of siblings) {
            const sibBill = sib.bill as any;
            if (sibBill && sibBill.total_amount < 0) {
              const creditAmount = Math.abs(sib.amount_allocated);
              const myShare = totalPositive > 0
                ? Math.round(creditAmount * (myAllocation / totalPositive) * 100) / 100
                : creditAmount;
              credits.push({
                ref: sibBill.reference_number || 'Credit',
                amount: myShare,
              });
            }
          }
        }

        const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);
        const bill = bills.find(b => b.id === billId);
        const billTotal = bill ? bill.total_amount : 0;
        breakdowns.set(billId, { cashPaid: billTotal - totalCredits, credits });
      }

      // Build payment groups (for consolidated row rendering)
      const groups = new Map<string, { paymentId: string; paymentDate: string; totalAmount: number; memo: string | null; billIds: string[]; allocations: { billId: string; amount: number; ref: string | null; billTotal: number; isCredit: boolean }[] }>();

      for (const payment of (payments || [])) {
        const paymentAllocations = (siblingAllocations || []).filter(a => a.bill_payment_id === payment.id);
        const allocs = paymentAllocations.map(a => {
          const billData = a.bill as any;
          return {
            billId: a.bill_id,
            amount: a.amount_allocated,
            ref: billData?.reference_number || null,
            billTotal: billData?.total_amount || 0,
            isCredit: (billData?.total_amount || 0) < 0,
          };
        });

        // Only include groups that contain at least one of our paidBillIds
        const relevantBillIds = allocs.filter(a => paidBillIds.includes(a.billId)).map(a => a.billId);
        if (relevantBillIds.length === 0) continue;

        groups.set(payment.id, {
          paymentId: payment.id,
          paymentDate: payment.payment_date,
          totalAmount: payment.total_amount,
          memo: payment.memo,
          billIds: relevantBillIds,
          allocations: allocs,
        });
      }

      return { breakdowns, groups };
    },
    enabled: isPaidStatus && paidBillIds.length > 0,
  });

  const paymentBreakdowns = paymentGroups?.breakdowns;
  const paymentGroupsMap = paymentGroups?.groups;

  // PO matching for approved/posted bills
  const billsForMatching = useMemo(() => {
    return bills.map(b => ({
      id: b.id,
      vendor_id: b.vendor_id,
      project_id: b.project_id,
      total_amount: b.total_amount,
      status: b.status,
      bill_lines: b.bill_lines?.map(l => ({
        cost_code_id: l.cost_code_id,
        cost_code_display: l.cost_codes ? `${l.cost_codes.code}: ${l.cost_codes.name}` : undefined,
        amount: l.amount,
        // Honor explicit "No PO" intent persisted on bill_lines.po_assignment.
        purchase_order_id: l.po_assignment === 'none' ? '__none__' : l.purchase_order_id,
        purchase_order_line_id: l.purchase_order_line_id,
        po_reference: (l as any).po_reference || null,
        po_assignment: l.po_assignment || null,
        memo: l.memo,
        cost_codes: l.cost_codes
      }))
    }));
  }, [bills]);

  const { data: poMatchingData } = useBillPOMatching(billsForMatching);

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
    let filtered = sortedBills;

    // Apply due-date filter (Approved tab "Due on or before" picker)
    if (dueDateFilter === "due-on-or-before" && filterDate && filtered) {
      const filterYMD = normalizeToYMD(filterDate.toISOString());
      filtered = filtered.filter(bill => {
        if (!bill.due_date) return false;
        return normalizeToYMD(bill.due_date) <= filterYMD;
      });
    }

    if (!searchQuery?.trim()) return filtered;

    const query = searchQuery.toLowerCase();
    return filtered.filter(bill => {
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
  }, [sortedBills, searchQuery, dueDateFilter, filterDate]);

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

  const handleConfirmPayment = (billIds: string[], paymentAccountId: string, paymentDate: string, memo?: string, paymentAmount?: number) => {
    if (billIds.length <= 1) {
      payBill.mutate(
        { billId: billIds[0], paymentAccountId, paymentDate, memo, paymentAmount },
        {
          onSuccess: () => {
            setPayBillDialogOpen(false);
            setBatchPayDialogOpen(false);
            setSelectedBillForPayment(null);
            setSelectedBillIds(new Set());
          }
        }
      );
    } else {
      payMultipleBills.mutate(
        { billIds, paymentAccountId, paymentDate, memo },
        {
          onSuccess: () => {
            setPayBillDialogOpen(false);
            setBatchPayDialogOpen(false);
            setSelectedBillForPayment(null);
            setSelectedBillIds(new Set());
          }
        }
      );
    }
  };

  // ===== Batch payment selection helpers (Approved tab only) =====
  const getVendorForBill = (billId: string) => bills.find(b => b.id === billId)?.vendor_id;
  const getSelectedVendor = () => {
    if (selectedBillIds.size === 0) return null;
    return getVendorForBill(Array.from(selectedBillIds)[0]);
  };
  const canSelectBill = (billId: string) => {
    if (selectedBillIds.size === 0) return true;
    return getSelectedVendor() === getVendorForBill(billId);
  };
  const handleCheckboxChange = (billId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      if (!canSelectBill(billId)) {
        const vendorName = bills.find(b => b.id === Array.from(selectedBillIds)[0])?.companies?.company_name || 'Unknown';
        toast({
          title: "Cannot select bill",
          description: `You can only select bills from the same vendor. Currently selected: ${vendorName}`,
          variant: "destructive",
        });
        return;
      }
      setSelectedBillIds(prev => new Set([...prev, billId]));
    } else {
      setSelectedBillIds(prev => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };
  const clearSelection = () => setSelectedBillIds(new Set());
  const handlePaySelectedBills = () => {
    if (selectedBillIds.size === 0) return;
    const selected = bills.filter(b => selectedBillIds.has(b.id));
    setSelectedBillForPayment(selected.length === 1 ? selected[0] : null);
    setBatchPayDialogOpen(true);
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

  // Compute bill total from lines with cent-precise rounding (matches EditBillDialog)
  const getBillDisplayAmount = (bill: BillForApproval): number => {
    if (bill.bill_lines && bill.bill_lines.length > 0) {
      return bill.bill_lines.reduce((sum, line) => {
        const lineAmount = Math.round((line.amount || 0) * 100) / 100;
        return sum + lineAmount;
      }, 0);
    }
    return bill.total_amount;
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

  const getCostCodeOrAccountData = (bill: BillForApproval) =>
    getBillCostCodeDisplay(bill.bill_lines);

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
    
    const naturalLotKey = (name: string) => {
      const m = name.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const costCodeBreakdown = Array.from(costCodeMap.entries()).map(([costCode, lotMap]) => ({
      costCode,
      lots: Array.from(lotMap.values()).sort((a, b) => naturalLotKey(a.name) - naturalLotKey(b.name) || a.name.localeCompare(b.name))
    }));
    
    const uniqueLotCount = uniqueLots.size;
    
    // Use bill.total_amount as the authoritative total to avoid rounding errors
    if (uniqueLotCount === 0) return { display: '-', costCodeBreakdown: [], totalAmount: bill.total_amount, uniqueLotCount: 0 };
    if (uniqueLotCount === 1 && costCodeBreakdown.length > 0) {
      return { display: costCodeBreakdown[0].lots[0]?.name || '-', costCodeBreakdown, totalAmount: bill.total_amount, uniqueLotCount: 1 };
    }
    
    return { display: `+${uniqueLotCount}`, costCodeBreakdown, totalAmount: bill.total_amount, uniqueLotCount };
  };

  // Helper to get bill memo summary from bill_lines (one entry per unique memo)
  const getBillMemoSummary = (bill: BillForApproval): string[] | null => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) return null;
    
    const memos = bill.bill_lines
      .map(line => (line.memo?.trim() || (line as any).description?.trim()))
      .filter((memo): memo is string => !!memo);
    
    if (memos.length === 0) return null;
    
    // Deduplicate memos
    return [...new Set(memos)];
  };

  const isDraftStatus = status === 'draft';
  const isPaidOrPostedStatus = status === 'paid' || status === 'posted' || 
    (Array.isArray(status) && (status.includes('paid') || status.includes('posted')));
  
  const canShowDeleteButton = 
    // Delete access is solely controlled by the can_delete_bills preference toggle
    (canDeleteBills && (
      status === 'void' ||
      status === 'posted' ||
      status === 'paid' ||
      (Array.isArray(status) && (status.includes('void') || status.includes('posted') || status.includes('paid')))
    ));

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills...</div>;
  }

  // Calculate total columns for colSpan (fixed column count for consistent layout)
  // Base: Vendor(1) + CostCode(1) + BillDate(1) + DueDate(1) + Amount(1) + Reference(1) + Memo(1) + Address(1) + Terms(1) + Files(1) + Notes(1) + FinalColumn(1) = 12
  // + Project(1) if shown = 13
  // + PayBill(1) if shown
  // + Delete(1) if shown
  // + PO Status(1) - always shown on all tabs
  const showPOStatusColumn = true;
  const baseColCount = 11 + (showAddressColumn ? 1 : 0) + (showProjectColumn ? 1 : 0) + (showPayBillButton ? 1 : 0) + (canShowDeleteButton ? 1 : 0) + (showPOStatusColumn ? 1 : 0) + (enableBatchPayment ? 1 : 0);

  // ===== Batch payment toolbar derived state =====
  const selectedBillsForBatch = useMemo(
    () => filteredBills.filter(b => selectedBillIds.has(b.id)),
    [filteredBills, selectedBillIds]
  );
  const selectedVendorName = selectedBillsForBatch.length > 0
    ? (selectedBillsForBatch[0].companies?.company_name || 'Unknown Vendor')
    : '';
  const selectedTotal = selectedBillsForBatch.reduce((sum, bill) => {
    const ob = bill.total_amount < 0
      ? bill.total_amount + (bill.amount_paid || 0)
      : bill.total_amount - (bill.amount_paid || 0);
    return sum + Math.round(ob * 100) / 100;
  }, 0);
  const hasOnlyCredits = selectedBillsForBatch.length > 0 && selectedBillsForBatch.every(bill => {
    const ob = bill.total_amount < 0
      ? bill.total_amount + (bill.amount_paid || 0)
      : bill.total_amount - (bill.amount_paid || 0);
    return ob < 0;
  });
  const headerTargetVendor = getSelectedVendor() || filteredBills[0]?.vendor_id;
  const headerSameVendorBills = filteredBills.filter(b => b.vendor_id === headerTargetVendor);
  const isHeaderChecked = enableBatchPayment && headerSameVendorBills.length > 0
    && headerSameVendorBills.every(b => selectedBillIds.has(b.id));
  const isHeaderIndeterminate = enableBatchPayment && (() => {
    const cnt = headerSameVendorBills.filter(b => selectedBillIds.has(b.id)).length;
    return cnt > 0 && cnt < headerSameVendorBills.length;
  })();
  const handleHeaderCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (headerTargetVendor) {
        setSelectedBillIds(new Set(headerSameVendorBills.map(b => b.id)));
      }
    } else {
      setSelectedBillIds(new Set());
    }
  };

  const renderBillRow = (bill: BillForApproval, memoSummary: string[] | null) => {
    const matchResult = poMatchingData?.get(bill.id);
    const rowAllMatches = matchResult?.matches || [];
    const rowClickable = rowAllMatches.length > 0;
    const handleRowClick = () => {
      if (!rowClickable) return;
      setPoDialogState({ open: true, matches: rowAllMatches, bill });
    };
    return (
    <TableRow
      key={bill.id}
      className={`h-11 ${rowClickable ? 'cursor-pointer' : ''}`}
      onClick={rowClickable ? handleRowClick : undefined}
    >
      {enableBatchPayment && (
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          <MinimalCheckbox
            checked={selectedBillIds.has(bill.id)}
            onChange={(e) => handleCheckboxChange(bill.id, e)}
          />
        </TableCell>
      )}
      {showProjectColumn && (
        <TableCell className="w-44">
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
      <TableCell className="w-32 max-w-[128px]">
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
      <TableCell className="w-36 max-w-[144px] overflow-hidden">
        {(() => {
          const { display, breakdown, total, count } = getCostCodeOrAccountData(bill);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate cursor-default">
                    {display}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {count <= 1 ? (
                    <p>{display}</p>
                  ) : (
                    <div className="space-y-1">
                      {breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between gap-4 text-xs">
                          <span>{item.name}</span>
                          <span>${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
                        <span>Total:</span>
                        <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })()}
      </TableCell>
      <TableCell className="w-20">
        {formatDisplayFromAny(bill.bill_date)}
      </TableCell>
      <TableCell className="w-20">
        {bill.due_date ? (
          (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(bill.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const isOverdue = dueDate < today && status !== 'paid';
            
            return (
              <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                {formatDisplayFromAny(bill.due_date)}
              </span>
            );
          })()
        ) : '-'}
      </TableCell>
      <TableCell className="w-20">
        {(() => {
          const isPostedStatus = status === 'posted' || (Array.isArray(status) && status.includes('posted'));
          const displayAmount = getBillDisplayAmount(bill);
          // For Approved (posted) bills, show open balance (total - amount_paid)
          // so partial payments are reflected, matching the legacy PayBillsTable.
          const openBalance = isPostedStatus
            ? (bill.total_amount < 0
                ? bill.total_amount + (bill.amount_paid || 0)
                : bill.total_amount - (bill.amount_paid || 0))
            : displayAmount;
          if (!isPaidStatus || openBalance < 0) {
            return (
              <div className="flex items-center gap-1">
                {formatCurrency(openBalance)}
                {openBalance < 0 && (
                  <Badge
                    variant="outline"
                    className="text-green-600 border-green-600 text-[10px] px-1 cursor-pointer hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreditHistoryDialog({ open: true, bill });
                    }}
                  >
                    CR
                  </Badge>
                )}
              </div>
            );
          }
          const breakdown = paymentBreakdowns?.get(bill.id);
          if (!breakdown || breakdown.credits.length === 0) {
            return formatCurrency(displayAmount);
          }
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 cursor-default">
                    <span>{formatCurrency(breakdown.cashPaid)}</span>
                    <Info className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-4">
                      <span>Bill Amount:</span>
                      <span>${Math.abs(displayAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    {breakdown.credits.map((cr, i) => (
                      <div key={i} className="flex justify-between gap-4 text-green-600">
                        <span>Credit Applied ({cr.ref}):</span>
                        <span>-${cr.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                    <div className="border-t pt-1 flex justify-between gap-4 font-medium">
                      <span>Cash Paid:</span>
                      <span>${breakdown.cashPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })()}
      </TableCell>
      <TableCell className="w-24 max-w-[96px]">
        <span className="block truncate">{bill.reference_number || '-'}</span>
      </TableCell>
      {/* Memo column */}
      <TableCell className="w-10 text-center">
        {memoSummary && memoSummary.length > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <FileText className="h-4 w-4 text-yellow-600 mx-auto cursor-default" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {memoSummary.map((memo, i) => (
                    <p key={i} className="whitespace-nowrap text-xs">{memo}</p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      {showAddressColumn && (
      <TableCell className="w-16 max-w-[64px]">
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
      )}
      <TableCell className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
        <BillFilesCell attachments={bill.bill_attachments || []} />
      </TableCell>
      <TableCell className="w-10 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotesDialog({ 
                    open: true, 
                    billId: bill.id,
                    billInfo: {
                      vendor: bill.companies?.company_name || 'Unknown Vendor',
                      amount: bill.total_amount
                    },
                    initialNotes: bill.notes || ''
                  });
                }}
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
      {showPOStatusColumn && (
        <TableCell className="w-20 text-center">
          {(() => {
            const matchResult = poMatchingData?.get(bill.id);
            const poStatus = matchResult?.overall_status || 'no_po';
            const allMatches = matchResult?.matches || [];
            
            return (
              <POStatusBadge
                status={poStatus}
                onClick={(e?: any) => {
                  e?.stopPropagation?.();
                  if (allMatches.length > 0) {
                    setPoDialogState({
                      open: true,
                      matches: allMatches,
                      bill: bill
                    });
                  }
                }}
              />
            );
          })()}
        </TableCell>
      )}
      {/* Final column: Actions for draft, Cleared for posted/paid */}
      <TableCell className="w-24 text-center" onClick={(e) => e.stopPropagation()}>
        {isDraftStatus ? (
          <TableRowActions actions={[
            { label: "Approve", onClick: () => handleActionChange(bill.id, 'approve'), disabled: approveBill.isPending || rejectBill.isPending },
            { label: "Edit", onClick: () => handleActionChange(bill.id, 'edit'), disabled: approveBill.isPending || rejectBill.isPending },
            { label: "Reject", onClick: () => handleActionChange(bill.id, 'reject'), variant: 'destructive' as const, disabled: approveBill.isPending || rejectBill.isPending },
            {
              label: "Delete Bill",
              onClick: () => deleteBill.mutate(bill.id),
              variant: "destructive" as const,
              requiresConfirmation: true,
              confirmTitle: "Delete Bill",
              confirmDescription: `Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This action cannot be undone.`,
              isLoading: deleteBill.isPending,
            },
          ]} />
        ) : (
          bill.reconciled ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      {showPayBillButton && (
        <TableCell className="text-center w-24">
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
        <TableCell className="text-center w-16">
          {showEditButton ? (
            <TableRowActions actions={[
              {
                label: "Edit",
                onClick: () => setEditingBillId(bill.id),
                disabled: bill.reconciled,
              },
              {
                label: "Delete Bill",
                onClick: () => deleteBill.mutate(bill.id),
                variant: "destructive",
                requiresConfirmation: true,
                confirmTitle: "Delete Bill",
                confirmDescription: `Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This will also delete all associated journal entries and attachments.`,
                isLoading: deleteBill.isPending,
                disabled: bill.reconciled,
              },
            ]} />
          ) : (
            <TableRowActions actions={[
              {
                label: "Edit",
                onClick: () => setEditingBillId(bill.id),
                disabled: bill.reconciled,
              },
              {
                label: "Delete Bill",
                onClick: () => deleteBill.mutate(bill.id),
                variant: "destructive",
                requiresConfirmation: true,
                confirmTitle: "Delete Bill",
                confirmDescription: `Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This will also delete all associated journal entries and attachments.`,
                isLoading: deleteBill.isPending,
                disabled: bill.reconciled,
              },
            ]} />
          )}
        </TableCell>
      )}
    </TableRow>
    );
  };

  return (
    <>
      <div className="flex flex-col min-w-0">
        {/* Batch payment toolbar (Approved tab only) */}
        {enableBatchPayment && selectedBillIds.size > 0 && (
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
              {hasOnlyCredits && (
                <span className="text-sm text-muted-foreground italic">Credits can only be applied alongside bills</span>
              )}
              <Button
                size="sm"
                onClick={handlePaySelectedBills}
                disabled={payBill.isPending || payMultipleBills.isPending || hasOnlyCredits}
              >
                Pay Selected Bills
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear Selection
              </Button>
            </div>
          </div>
        )}
        {/* Scrollable table container */}
        <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  {enableBatchPayment && (
                    <TableHead className="w-10">
                      <MinimalCheckbox
                        checked={isHeaderChecked}
                        indeterminate={isHeaderIndeterminate}
                        onChange={handleHeaderCheckboxChange}
                      />
                    </TableHead>
                  )}
                  {showProjectColumn && (
                    <TableHead className="w-44">
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
                  <TableHead className="w-32">
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
                  <TableHead className="w-36">Cost Code</TableHead>
                  <TableHead className="w-20">
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
                  <TableHead className="w-20">
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
                  <TableHead className="w-20">Amount</TableHead>
                  <TableHead className="w-24">Reference</TableHead>
                  <TableHead className="w-10 text-center">Description</TableHead>
                  {showAddressColumn && <TableHead className="w-16">Address</TableHead>}
                  <TableHead className="w-10 text-center">Files</TableHead>
                  <TableHead className="w-10 text-center">Notes</TableHead>
                  {showPOStatusColumn && (
                    <TableHead className="w-20 text-center">PO Status</TableHead>
                  )}
                  {/* Final column: Actions for draft, Cleared for posted/paid - always renders for consistent layout */}
                  <TableHead className="w-20 text-center">
                    {isDraftStatus ? 'Actions' : 'Cleared'}
                  </TableHead>
                  {showPayBillButton && (
                    <TableHead className="text-center w-20">Pay Bill</TableHead>
                  )}
                  {canShowDeleteButton && (
                    <TableHead className="text-center w-16">
                      Actions
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
            ) : isPaidStatus && paymentGroupsMap && paymentGroupsMap.size > 0 ? (
              (() => {
                // Build consolidated view: group bills by payment
                const billToPaymentMap = new Map<string, string>();
                const renderedPayments = new Set<string>();
                
                paymentGroupsMap.forEach((group, paymentId) => {
                  group.billIds.forEach(billId => billToPaymentMap.set(billId, paymentId));
                  // Also map credit allocation bill IDs to prevent duplicate standalone rows
                  group.allocations.forEach(alloc => {
                    if (alloc.isCredit) {
                      billToPaymentMap.set(alloc.billId, paymentId);
                    }
                  });
                });

                // Also find bills not in any payment group (standalone)
                const rows: React.ReactNode[] = [];
                
                for (const bill of filteredBills) {
                  const paymentId = billToPaymentMap.get(bill.id);
                  
                  if (paymentId && paymentGroupsMap.has(paymentId)) {
                    const group = paymentGroupsMap.get(paymentId)!;
                    const isMulti = group.allocations.length > 1;
                    
                    if (isMulti) {
                      // Only render the payment header once
                      if (!renderedPayments.has(paymentId)) {
                        renderedPayments.add(paymentId);
                        const isExpanded = expandedPayments.has(paymentId);
                        const toggleExpand = () => {
                          setExpandedPayments(prev => {
                            const next = new Set(prev);
                            if (next.has(paymentId)) next.delete(paymentId);
                            else next.add(paymentId);
                            return next;
                          });
                        };
                        
                        // Find the first bill in this group for vendor/project info
                        const firstBill = filteredBills.find(b => group.billIds.includes(b.id)) || bill;
                        const formatCurrencyValue = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount));

                        // Payment header row
                        rows.push(
                          <TableRow 
                            key={`payment-${paymentId}`} 
                            className="h-11 cursor-pointer"
                            onClick={toggleExpand}
                          >
                            {showProjectColumn && (
                              <TableCell className="w-44">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block truncate">{firstBill.projects?.address || '-'}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{firstBill.projects?.address || '-'}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            )}
                            <TableCell className="w-32 max-w-[128px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                      <span className="block truncate">{firstBill.companies?.company_name || 'Unknown Vendor'}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{firstBill.companies?.company_name || 'Unknown Vendor'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-36 max-w-[144px] overflow-hidden">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">{group.allocations.length} items</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{group.allocations.length} items</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-20">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">{formatDisplayFromAny(group.paymentDate)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{formatDisplayFromAny(group.paymentDate)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-20">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">-</span>
                                  </TooltipTrigger>
                                  <TooltipContent><p>-</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-20">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">{formatCurrencyValue(group.totalAmount)}</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{formatCurrencyValue(group.totalAmount)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-24 max-w-[96px]">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate">Payment</span>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Payment</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="w-10 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>
                            {showAddressColumn && <TableCell className="w-16">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>}
                            <TableCell className="w-10 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>
                            <TableCell className="w-10 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>
                            {showPOStatusColumn && <TableCell className="w-20 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>}
                            <TableCell className="w-24 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>
                            {showPayBillButton && <TableCell className="text-center w-20">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>}
                            {canShowDeleteButton && <TableCell className="text-center w-16">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 opacity-0 pointer-events-none" />
                              </div>
                            </TableCell>}
                          </TableRow>
                        );

                        // Expanded child rows
                        if (isExpanded) {
                          const sortedAllocations = [...group.allocations].sort((a, b) => (b.isCredit ? 1 : 0) - (a.isCredit ? 1 : 0));
                          for (const alloc of sortedAllocations) {
                            const childBill = filteredBills.find(b => b.id === alloc.billId);
                            rows.push(
                              <TableRow key={`alloc-${paymentId}-${alloc.billId}`} className="h-11">
                                {showProjectColumn && <TableCell className="w-44" />}
                                <TableCell className="w-32 max-w-[128px] pl-10">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate">
                                          {alloc.isCredit ? 'Credit Memo' : 'Bill'}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{alloc.isCredit ? 'Credit Memo' : 'Bill'}</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="w-36 max-w-[144px] overflow-hidden">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate">
                                          {childBill ? (() => { const { display } = getCostCodeOrAccountData(childBill); return display; })() : '-'}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{childBill ? (() => { const { display } = getCostCodeOrAccountData(childBill); return display; })() : '-'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="w-20">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate">{childBill ? formatDisplayFromAny(childBill.bill_date) : '-'}</span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{childBill ? formatDisplayFromAny(childBill.bill_date) : '-'}</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="w-20">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate">{childBill?.due_date ? formatDisplayFromAny(childBill.due_date) : '-'}</span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{childBill?.due_date ? formatDisplayFromAny(childBill.due_date) : '-'}</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="w-20">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1">
                                          <span className={cn("block truncate", alloc.isCredit && "text-green-600 font-medium")}>
                                            {alloc.isCredit
                                              ? `(${formatCurrencyValue(Math.abs(alloc.amount))})`
                                              : formatCurrencyValue(alloc.amount)}
                                          </span>
                                          {alloc.isCredit && (
                                            <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] px-1">
                                              CR
                                            </Badge>
                                          )}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{alloc.isCredit
                                          ? `(${formatCurrencyValue(Math.abs(alloc.amount))})`
                                          : formatCurrencyValue(alloc.amount)}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="w-24 max-w-[96px]">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate">{alloc.ref || '-'}</span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{alloc.ref || '-'}</p></TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell className="w-10 text-center">
                                  {childBill ? (() => {
                                    const childMemo = getBillMemoSummary(childBill);
                                    return childMemo ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <FileText className="h-4 w-4 text-yellow-600 mx-auto cursor-default" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p className="whitespace-pre-wrap">{childMemo}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    );
                                  })() : (
                                    <div className="flex justify-center">
                                      <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                    </div>
                                  )}
                                </TableCell>
                                {showAddressColumn && <TableCell className="w-16">
                                  <div className="flex justify-center">
                                    <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                  </div>
                                </TableCell>}
                                <TableCell className="w-10 text-center">
                                  {childBill ? <BillFilesCell attachments={childBill.bill_attachments || []} /> : 
                                    <div className="flex justify-center">
                                      <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                    </div>
                                  }
                                </TableCell>
                                <TableCell className="w-10 text-center">
                                  {childBill ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-muted"
                                            onClick={() => setNotesDialog({ 
                                              open: true, 
                                              billId: childBill.id,
                                              billInfo: {
                                                vendor: childBill.companies?.company_name || 'Unknown Vendor',
                                                amount: childBill.total_amount
                                              },
                                              initialNotes: childBill.notes || ''
                                            })}
                                          >
                                            {childBill.notes?.trim() ? (
                                              <StickyNote className="h-3.5 w-3.5 text-yellow-600" />
                                            ) : (
                                              <span className="text-xs text-muted-foreground">Add</span>
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{childBill.notes?.trim() ? 'View/Edit Notes' : 'Add Notes'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : (
                                    <div className="flex justify-center">
                                      <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                    </div>
                                  )}
                                </TableCell>
                                {showPOStatusColumn && <TableCell className="w-20 text-center">
                                  <div className="flex justify-center">
                                    <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                  </div>
                                </TableCell>}
                                <TableCell className="w-24 text-center">
                                  <div className="flex justify-center">
                                    <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                  </div>
                                </TableCell>
                                {showPayBillButton && <TableCell className="text-center w-20">
                                  <div className="flex justify-center">
                                    <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                  </div>
                                </TableCell>}
                                {canShowDeleteButton && <TableCell className="text-center w-16">
                                  <div className="flex justify-center">
                                    <div className="h-8 w-8 opacity-0 pointer-events-none" />
                                  </div>
                                </TableCell>}
                              </TableRow>
                            );
                          }
                        }
                      }
                      // Skip individual rendering for bills in multi-payment groups
                      continue;
                    }
                  }
                  
                  // Standalone bill or single-bill payment — render normally
                  const memoSummary = getBillMemoSummary(bill);
                  rows.push(renderBillRow(bill, memoSummary));
                }
                
                return rows;
              })()
            ) : (
              filteredBills.map((bill) => {
                const memoSummary = getBillMemoSummary(bill);
                return renderBillRow(bill, memoSummary);
              })
            )}
              </TableBody>
            </Table>
        </div>

        {/* Footer - always visible, never scrolls */}
        {filteredBills.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground shrink-0">
            <p>Total bills: {filteredBills.length}</p>
            <p>Total amount: {formatCurrency(filteredBills.reduce((sum, bill) => {
              const amountPaid = (bill as any).amount_paid || 0;
              const openBalance = bill.total_amount < 0
                ? bill.total_amount + amountPaid
                : bill.total_amount - amountPaid;
              return sum + Math.round(openBalance * 100) / 100;
            }, 0))}</p>
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
            setEditingBillId(null);
          }
        }}
        billId={editingBillId || ''}
      />

      <BillPOSummaryDialog
        open={poDialogState.open}
        onOpenChange={(open) => { if (!open) setPoDialogState({ open: false, matches: [], bill: null }); }}
        matches={poDialogState.matches}
        bill={poDialogState.bill}
      />
    </>
  );
}