import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBills } from "@/hooks/useBills";
import { useUserRole } from "@/hooks/useUserRole";
import { BillFilesCell } from "./BillFilesCell";
import { DeleteButton } from "@/components/ui/delete-button";
import { formatDisplayFromAny, normalizeToYMD } from "@/utils/dateOnly";

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
}

export function BillsApprovalTable({ status, projectId, projectIds, showProjectColumn = true }: BillsApprovalTableProps) {
  const { approveBill, rejectBill, deleteBill } = useBills();
  const { canDeleteBills, isOwner } = useUserRole();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    billId: string;
    billInfo?: BillForApproval;
  }>({
    open: false,
    action: '',
    billId: '',
    billInfo: undefined,
  });

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
      
      // Sort by date strings (YYYY-MM-DD lexicographical sort)
      return allBills
        .sort((a, b) => normalizeToYMD(b.bill_date).localeCompare(normalizeToYMD(a.bill_date))) as BillForApproval[];
    },
  });

  const handleActionChange = (billId: string, action: string) => {
    const bill = bills.find(b => b.id === billId);
    setConfirmDialog({
      open: true,
      action,
      billId,
      billInfo: bill,
    });
  };

  const handleConfirmedAction = () => {
    if (confirmDialog.action === 'approve') {
      approveBill.mutate(confirmDialog.billId);
    } else if (confirmDialog.action === 'reject') {
      rejectBill.mutate(confirmDialog.billId);
    }
    setConfirmDialog({ open: false, action: '', billId: '', billInfo: undefined });
  };

  const handleCancelAction = () => {
    setConfirmDialog({ open: false, action: '', billId: '', billInfo: undefined });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
                <TableHead className="h-8 px-2 py-1 text-xs font-medium">Project</TableHead>
              )}
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Vendor</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Cost Code</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Bill Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Due Date</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-40">Reference</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-24">Terms</TableHead>
              <TableHead className="h-8 px-2 py-1 text-xs font-medium w-16">Files</TableHead>
              {canShowActions && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-left w-28">Actions</TableHead>
              )}
              {canShowDeleteButton && (
                <TableHead className="h-8 px-2 py-1 text-xs font-medium text-center w-20">Delete</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8 + (showProjectColumn ? 1 : 0) + (canShowActions ? 1 : 0) + (canShowDeleteButton ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                  No bills found for this status.
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill) => (
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
                    {bill.due_date ? formatDisplayFromAny(bill.due_date) : '-'}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-xs">
                    {formatCurrency(bill.total_amount)}
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
                      <DeleteButton
                        onDelete={() => deleteBill.mutate(bill.id)}
                        title="Delete Bill"
                        description={`Are you sure you want to delete this bill from ${bill.companies?.company_name} for ${formatCurrency(bill.total_amount)}? This will also delete all associated journal entries and attachments.`}
                        size="icon"
                        variant="ghost"
                        isLoading={deleteBill.isPending}
                        className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 mx-auto"
                      />
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
    </>
  );
}