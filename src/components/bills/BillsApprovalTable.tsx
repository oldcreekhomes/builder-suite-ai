import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [sortColumn, setSortColumn] = useState<'project' | 'due_date' | 'vendor' | 'bill_date' | null>(
    defaultSortBy === 'due_date' ? 'due_date' : null
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
    billInfo?: BillForApproval;
  }>({
    open: false,
    billInfo: undefined,
  });
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

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
        .in('status', statusArray);

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

  const handleConfirmPayment = (billId: string, paymentAccountId: string, paymentDate: string, memo?: string) => {
    payBill.mutate(
      { billId, paymentAccountId, paymentDate, memo },
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

  const getCostCodeOrAccount = (bill: BillForApproval) => {
    if (!bill.bill_lines || bill.bill_lines.length === 0) return '-';
    
    const uniqueItems = new Set<string>();
    bill.bill_lines.forEach(line => {
      if (line.cost_codes) {
        uniqueItems.add(`${line.cost_codes.code}: ${line.cost_codes.name}`);
      } else if (line.accounts) {
        uniqueItems.add(`${line.accounts.code}: ${line.accounts.name}`);
      }
    });
    
    const items = Array.from(uniqueItems);
    if (items.length === 0) return '-';
    if (items.length === 1) return items[0];
    return `${items[0]} +${items.length - 1}`;
  };

  const canShowActions = status === 'draft';
  const canShowDeleteButton = 
    // For rejected bills (void status), only owners can delete
    (isOwner && (status === 'void' || (Array.isArray(status) && status.includes('void')))) ||
    // For posted/paid bills, owners and accountants can delete
    (canDeleteBills && (status === 'posted' || status === 'paid' || (Array.isArray(status) && (status.includes('posted') || status.includes('paid')))));
  
  const isPaidTab = status === 'paid' || (Array.isArray(status) && status.includes('paid'));

  if (isLoading) {
    return <div className="p-8 text-center">Loading bills...</div>;
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-8">
              {showProjectColumn && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">
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
            <TableHead className="h-8 px-2 py-1 text-xs font-medium">
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
            <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
            <TableHead className="h-8 px-2 py-1 text-xs font-medium">
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
            <TableHead className="h-8 px-2 py-1 text-xs font-medium">
              {enableSorting ? (
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
              ) : (
                'Due Date'
              )}
            </TableHead>
            <TableHead className="h-8 px-2 py-1 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-40">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Terms</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-16">Files</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-16">Notes</TableHead>
              {isPaidTab && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-16">Cleared</TableHead>
              )}
          {showPayBillButton && (
            <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-28">Pay Bill</TableHead>
          )}
              {canShowActions && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-left w-28">Actions</TableHead>
              )}
              {canShowDeleteButton && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-20">
                  {showEditButton ? 'Actions' : 'Delete'}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10 + (showProjectColumn ? 1 : 0) + (isPaidTab ? 1 : 0) + (showPayBillButton ? 1 : 0) + (canShowActions ? 1 : 0) + (canShowDeleteButton ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  No bills found for this status.
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow key={bill.id} className="h-10">
                  {showProjectColumn && (
                    <TableCell className="px-2 py-1 text-xs">
                      {bill.projects?.address || '-'}
                    </TableCell>
                  )}
                  <TableCell className="px-2 py-1 text-xs">
                    {bill.companies?.company_name || 'Unknown Vendor'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {getCostCodeOrAccount(bill)}
                  </TableCell>
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
                  <TableCell className="px-2 py-1 text-xs">
                    <div className="flex items-center gap-2">
                      {formatCurrency(bill.total_amount)}
                      {bill.total_amount < 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Credit
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs whitespace-nowrap">
                    {bill.reference_number || '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {formatTerms(bill.terms)}
                  </TableCell>
            <TableCell className="px-2 py-1">
              <BillFilesCell attachments={bill.bill_attachments || []} />
            </TableCell>
            <TableCell className="px-2 py-1 text-center">
              {bill.notes?.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-muted"
                  onClick={() => setNotesDialog({ open: true, billInfo: bill })}
                >
                  <StickyNote className="h-3.5 w-3.5 text-yellow-600" />
                </Button>
              )}
            </TableCell>
            {isPaidTab && (
              <TableCell className="px-2 py-1 text-center">
                {bill.reconciled && <Check className="h-4 w-4 text-green-600 mx-auto" />}
              </TableCell>
            )}
            {showPayBillButton && (
                <TableCell className="py-1 text-xs text-center">
                      <Button
                        size="sm"
                        onClick={() => handlePayBill(bill)}
                        disabled={payBill.isPending}
                        className="h-7 text-xs px-3"
                      >
                        {payBill.isPending ? "Processing..." : "Pay Bill"}
                      </Button>
                    </TableCell>
                  )}
                  {canShowActions && (
                    <TableCell className="py-1 text-left">
                      <div className="flex justify-start">
                        <Select
                          onValueChange={(value) => handleActionChange(bill.id, value)}
                          disabled={approveBill.isPending || rejectBill.isPending}
                        >
                          <SelectTrigger className="h-8 w-24 text-xs border-gray-200 bg-white hover:bg-gray-50">
                            <SelectValue placeholder="Actions" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                            <SelectItem value="approve" className="text-xs hover:bg-gray-100 bg-white">Approve</SelectItem>
                            <SelectItem value="reject" className="text-xs hover:bg-gray-100 bg-white">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  )}
                   {canShowDeleteButton && (
                    <TableCell className="py-1 text-center">
                      {!bill.reconciled && (
                        <div className="flex items-center justify-center gap-1">
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
                          <DeleteButton
                            onDelete={() => deleteBill.mutate(bill.id)}
                            title="Delete Bill"
                            description={`Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This will also delete all associated journal entries and attachments.`}
                            size="icon"
                            variant="ghost"
                            isLoading={deleteBill.isPending}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                          />
                        </div>
                      )}
                    </TableCell>
                   )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
              {confirmDialog.action === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Notes (Optional)'}
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
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedAction}
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
        bill={selectedBillForPayment}
        onConfirm={handleConfirmPayment}
        isLoading={payBill.isPending}
      />

      <Dialog open={notesDialog.open} onOpenChange={(open) => !open && setNotesDialog({ open: false, billInfo: undefined })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-yellow-600" />
              Bill Notes
            </DialogTitle>
            {notesDialog.billInfo && (
              <div className="text-sm text-muted-foreground mt-1">
                {notesDialog.billInfo.companies?.company_name} - {formatCurrency(notesDialog.billInfo.total_amount)}
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-2">
            <div className="rounded-md border border-input bg-muted/50 p-3 text-sm whitespace-pre-wrap">
              {notesDialog.billInfo?.notes || "No notes available"}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setNotesDialog({ open: false, billInfo: undefined })}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditBillDialog
        open={editingBillId !== null}
        onOpenChange={(open) => !open && setEditingBillId(null)}
        billId={editingBillId || ''}
      />
    </>
  );
}